const Logger = require('../utils/logger');
const db = require('../config/database');
const binanceService = require('./binanceService');
const { calculatePositionSize } = require('../utils/helpers');

/**
 * Strateji Motoru
 * Sinyalleri değerlendirir, fiyat izler, trade açar/kapatır
 */
class StrategyEngine {
  constructor() {
    this.activeSignals = new Map();   // signalId -> signal data
    this.monitorInterval = null;
    this.io = null;
    this.paperEngine = null;
    this.isRunning = false;
  }

  /**
   * Strateji motorunu başlatır
   */
  async initialize(io, paperEngine) {
    this.io = io;
    this.paperEngine = paperEngine;

    // Bekleyen sinyalleri yükle
    await this.loadPendingSignals();

    // Fiyat izleme döngüsünü başlat
    this.startMonitoring();

    await Logger.info('StrategyEngine', 'Strateji motoru başlatıldı');
  }

  /**
   * Bekleyen sinyalleri DB'den yükler
   */
  async loadPendingSignals() {
    try {
      const [signals] = await db.execute(
        `SELECT * FROM signals WHERE status IN ('PENDING', 'ACTIVE') AND validity = 1`
      );

      for (const signal of signals) {
        this.activeSignals.set(signal.id, signal);
      }

      await Logger.info('StrategyEngine', `${signals.length} bekleyen sinyal yüklendi`);
    } catch (error) {
      await Logger.error('StrategyEngine', 'Sinyaller yüklenemedi', error.message);
    }
  }

  /**
   * Yeni sinyal ekler
   */
  async addSignal(signalData) {
    try {
      const signal = {
        id: signalData.signalId,
        symbol: signalData.symbol,
        direction: signalData.direction,
        entry_min: signalData.entryMin,
        entry_max: signalData.entryMax,
        stop_loss: signalData.stopLoss,
        take_profit_1: signalData.takeProfits[0] || null,
        take_profit_2: signalData.takeProfits[1] || null,
        take_profit_3: signalData.takeProfits[2] || null,
        take_profit_4: signalData.takeProfits[3] || null,
        leverage: signalData.leverage || 10,
        status: 'PENDING',
        created_at: new Date()
      };

      this.activeSignals.set(signal.id, signal);
      await Logger.info('StrategyEngine', `Yeni sinyal eklendi: ${signal.symbol} ${signal.direction}`);

      return signal;
    } catch (error) {
      await Logger.error('StrategyEngine', 'Sinyal eklenemedi', error.message);
    }
  }

  /**
   * Ana izleme döngüsü
   */
  startMonitoring() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.monitorInterval = setInterval(async () => {
      await this.evaluateSignals();
    }, 3000); // 3 saniyede bir kontrol

    Logger.info('StrategyEngine', 'Fiyat izleme döngüsü başlatıldı (3s)');
  }

  /**
   * Tüm aktif sinyalleri değerlendirir
   */
  async evaluateSignals() {
    for (const [signalId, signal] of this.activeSignals) {
      try {
        const currentPrice = binanceService.getPrice(signal.symbol);
        if (!currentPrice) continue;

        if (signal.status === 'PENDING') {
          await this.checkEntry(signal, currentPrice);
        }
      } catch (error) {
        // Sessiz hata - döngüyü kırmaz
      }
    }

    // Açık trade'lerin TP/SL kontrolü
    if (this.paperEngine) {
      await this.paperEngine.monitorOpenTrades();
    }
  }

  /**
   * Entry bölgesine girip girmediğini kontrol eder
   */
  async checkEntry(signal, currentPrice) {
    const entryMin = parseFloat(signal.entry_min);
    const entryMax = parseFloat(signal.entry_max) || entryMin;

    // Entry zone kontrolü
    let shouldEnter = false;

    if (signal.direction === 'LONG') {
      // LONG için fiyat entry zonuna düşmeli
      shouldEnter = currentPrice >= entryMin && currentPrice <= entryMax;
    } else {
      // SHORT için fiyat entry zonuna çıkmalı
      shouldEnter = currentPrice >= entryMin && currentPrice <= entryMax;
    }

    // Max bekleme süresi kontrolü
    const maxWaitMs = 60 * 60 * 1000; // 60 dakika varsayılan
    const elapsed = Date.now() - new Date(signal.created_at).getTime();
    if (elapsed > maxWaitMs) {
      await this.expireSignal(signal);
      return;
    }

    if (shouldEnter) {
      await this.triggerEntry(signal, currentPrice);
    }
  }

  /**
   * Trade açar
   */
  async triggerEntry(signal, entryPrice) {
    try {
      // Sinyali aktif yap
      await db.execute('UPDATE signals SET status = ? WHERE id = ?', ['FILLED', signal.id]);
      signal.status = 'FILLED';

      // Paper trade aç
      if (this.paperEngine) {
        const trade = await this.paperEngine.openTrade({
          signalId: signal.id,
          symbol: signal.symbol,
          direction: signal.direction,
          entryPrice,
          stopLoss: parseFloat(signal.stop_loss),
          takeProfits: [
            signal.take_profit_1 ? parseFloat(signal.take_profit_1) : null,
            signal.take_profit_2 ? parseFloat(signal.take_profit_2) : null,
            signal.take_profit_3 ? parseFloat(signal.take_profit_3) : null,
            signal.take_profit_4 ? parseFloat(signal.take_profit_4) : null
          ].filter(Boolean),
          leverage: signal.leverage || 10
        });

        // WebSocket bildir
        if (this.io) {
          this.io.emit('tradeOpened', trade);
        }
      }

      // Sinyali aktif listeden kaldır
      this.activeSignals.delete(signal.id);

      await Logger.info('StrategyEngine', `Trade açıldı: ${signal.symbol} ${signal.direction} @ ${entryPrice}`);
    } catch (error) {
      await Logger.error('StrategyEngine', `Trade açılırken hata: ${signal.symbol}`, error.message);
    }
  }

  /**
   * Sinyali expire eder (süresi doldu)
   */
  async expireSignal(signal) {
    await db.execute('UPDATE signals SET status = ? WHERE id = ?', ['EXPIRED', signal.id]);
    this.activeSignals.delete(signal.id);
    await Logger.info('StrategyEngine', `Sinyal süresi doldu: ${signal.symbol}`);

    if (this.io) {
      this.io.emit('signalExpired', { signalId: signal.id, symbol: signal.symbol });
    }
  }

  /**
   * Motoru durdurur
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isRunning = false;
    Logger.info('StrategyEngine', 'Strateji motoru durduruldu');
  }

  /**
   * Durumu döndürür
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeSignals: this.activeSignals.size,
      signals: Array.from(this.activeSignals.values()).map(s => ({
        id: s.id,
        symbol: s.symbol,
        direction: s.direction,
        status: s.status
      }))
    };
  }
}

module.exports = new StrategyEngine();
