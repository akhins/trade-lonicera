const Logger = require('../utils/logger');
const db = require('../config/database');
const binanceService = require('./binanceService');

/**
 * Trade Motoru v2
 * ─────────────────────────────────────────────
 * Sinyal alır → `trades` tablosuna kaydeder → TP/SL izler → kapatır
 * Tüm trade verileri (entry, SL, TP, R/R, sinyal nedeni, indikatör değerleri)
 * eksiksiz kayıt edilir.
 */
class TradeEngine {
  constructor() {
    this.openTrades = new Map();
    this.monitorInterval = null;
    this.isRunning = false;
    this.maxOpenTrades = 10;
    this.balance = 10000; // Default demo balance
  }

  /**
   * Trade motorunu başlatır; DB'den açık trade'leri yükler
   */
  async initialize() {
    await Logger.info('TradeEngine', 'Trade motoru başlatılıyor...');

    await this.loadOpenTrades();
    await this.loadSettings();
    await this.loadCurrentBalance();
    this.startPositionMonitoring();

    await Logger.info('TradeEngine',
      `Trade motoru başlatıldı. ${this.openTrades.size} açık trade var. Limit: ${this.maxOpenTrades}`
    );
  }

  /**
   * Ayarları DB'den yükler
   */
  async loadSettings() {
    try {
      const [rows] = await db.execute(
        "SELECT setting_value FROM settings WHERE setting_key = 'max_open_trades'"
      );
      if (rows.length > 0) {
        this.maxOpenTrades = parseInt(rows[0].setting_value) || 10;
      }
      
      const [balRows] = await db.execute(
        "SELECT setting_value FROM settings WHERE setting_key = 'paper_balance'"
      );
      if (balRows.length > 0) {
        this.initialBalance = parseFloat(balRows[0].setting_value) || 10000;
      }
    } catch (error) {
      await Logger.error('TradeEngine', 'Ayarlar yüklenemedi', error.message);
    }
  }

  /**
   * Güncel bakiyeyi yükler
   */
  async loadCurrentBalance() {
    try {
      const [rows] = await db.execute(
        'SELECT balance FROM balance_history ORDER BY recorded_at DESC LIMIT 1'
      );
      if (rows.length > 0) {
        this.balance = parseFloat(rows[0].balance);
      } else {
        this.balance = this.initialBalance || 10000;
        await this.updateBalanceHistory(0, 'Başlangıç bakiyesi');
      }
    } catch (err) {
      this.balance = 10000;
    }
  }

  /**
   * Bakiye geçmişini günceller
   */
  async updateBalanceHistory(changeAmount, reason, tradeId = null) {
    try {
      this.balance += changeAmount;
      await db.execute(
        'INSERT INTO balance_history (balance, change_amount, change_reason, trade_id) VALUES (?, ?, ?, ?)',
        [this.balance, changeAmount, reason, tradeId]
      );
    } catch (error) {
      await Logger.error('TradeEngine', 'Bakiye geçmişi güncellenirken hata', error.message);
    }
  }

  /**
   * Açık trade'leri DB'den yükler
   */
  async loadOpenTrades() {
    try {
      const [trades] = await db.execute(
        "SELECT * FROM trades WHERE status = 'OPEN'"
      );

      for (const trade of trades) {
        // Sayısal alanları parse et
        this.openTrades.set(trade.symbol, {
          ...trade,
          entry_price:      parseFloat(trade.entry_price),
          stop_loss:        parseFloat(trade.stop_loss),
          take_profit:      parseFloat(trade.take_profit),
          risk_reward_ratio: parseFloat(trade.risk_reward_ratio),
          quantity:         parseFloat(trade.quantity),
          leverage:         parseInt(trade.leverage),
          pnl:              parseFloat(trade.pnl || 0),
          pnl_percent:      parseFloat(trade.pnl_percent || 0)
        });
      }

      await Logger.info('TradeEngine', `${trades.length} açık trade yüklendi`);
    } catch (error) {
      await Logger.error('TradeEngine', 'Açık trade\'ler yüklenemedi', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Trade Açma
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sinyale göre yeni demo trade açar
   * @param {Object} signal - signalEngine çıktısı
   * @returns {boolean} Başarılı ise true
   */
  async openTrade(signal) {
    try {
      const { symbol, direction, entryPrice, stopLoss, takeProfit,
              riskRewardRatio, leverage, signalReason, indicatorValues } = signal;

      // ── Aynı sembolde açık trade var mı? ─────────────────────────────────
      if (this.openTrades.has(symbol)) {
        await Logger.info('TradeEngine',
          `${symbol} için zaten açık trade mevcut — yeni trade açılmadı`
        );
        return false;
      }

      // ── Max limit kontrolü ────────────────────────────────────────────────
      if (this.openTrades.size >= this.maxOpenTrades) {
        await Logger.warn('TradeEngine',
          `Maksimum açık trade limiti (${this.maxOpenTrades}) aşıldı`
        );
        return false;
      }

      // ── Pozisyon büyüklüğü (250 USD notional × leverage) ─────────────────
      const notionalUSD = 250;
      const effectiveLeverage = leverage || 5; // Default 5x
      const quantity = parseFloat(((notionalUSD * effectiveLeverage) / entryPrice).toFixed(8));

      // ── DB kaydı ─────────────────────────────────────────────────────────
      const [result] = await db.execute(
        `INSERT INTO trades
           (symbol, direction, entry_price, stop_loss, take_profit,
            risk_reward_ratio, quantity, leverage, status,
            pnl, pnl_percent, open_time, signal_reason, indicator_values)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 0, 0, NOW(), ?, ?)`,
        [
          symbol, direction, entryPrice, stopLoss, takeProfit,
          riskRewardRatio, quantity, leverage || 1,
          signalReason, indicatorValues
        ]
      );

      const trade = {
        id: result.insertId,
        symbol, direction,
        entry_price:       entryPrice,
        stop_loss:         stopLoss,
        take_profit:       takeProfit,
        risk_reward_ratio: riskRewardRatio,
        quantity,
        leverage:          leverage || 1,
        status:            'OPEN',
        pnl:               0,
        pnl_percent:       0,
        open_time:         new Date(),
        signal_reason:     signalReason,
        indicator_values:  indicatorValues
      };

      this.openTrades.set(symbol, trade);

      await Logger.info('TradeEngine',
        `📈 ${direction} trade açıldı: ${symbol} @ ${entryPrice} | SL: ${stopLoss} | TP: ${takeProfit} | R/R: 1:${riskRewardRatio}`
      );

      return true;
    } catch (error) {
      await Logger.error('TradeEngine', `Trade açılamadı: ${signal.symbol}`, error.message);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pozisyon İzleme
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Periyodik pozisyon izlemeyi başlatır (her 30 saniye)
   */
  startPositionMonitoring() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.monitorInterval = setInterval(async () => {
      await this.monitorPositions();
    }, 30 * 1000); // 30 saniye

    Logger.info('TradeEngine', 'Pozisyon izleme başlatıldı (30s)');
  }

  /**
   * Tüm açık trade'lerin TP/SL kontrolünü yapar
   */
  async monitorPositions() {
    if (this.openTrades.size === 0) return;

    for (const [symbol, trade] of this.openTrades) {
      try {
        // Güncel fiyat (önce cache, yoksa API)
        let currentPrice = binanceService.getPrice(symbol);
        if (!currentPrice) {
          currentPrice = await binanceService.fetchPrice(symbol);
        }
        if (!currentPrice) continue;

        // PnL hesapla
        const { pnl, pnlPercent } = this._calculatePnL(trade, currentPrice);

        // TP / SL kontrolü
        let closeReason = null;

        if (trade.direction === 'LONG') {
          if (currentPrice >= trade.take_profit) closeReason = 'TP';
          else if (currentPrice <= trade.stop_loss) closeReason = 'SL';
        } else { // SHORT
          if (currentPrice <= trade.take_profit) closeReason = 'TP';
          else if (currentPrice >= trade.stop_loss) closeReason = 'SL';
        }

        if (closeReason) {
          await this.closeTrade(trade, currentPrice, pnl, pnlPercent, closeReason);
        } else {
          // Gerçek zamanlı PnL güncelleme (her 30s)
          await this._updatePnL(trade.id, pnl, pnlPercent);
        }
      } catch (error) {
        await Logger.error('TradeEngine', `${symbol} izleme hatası`, error.message);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Trade Kapatma
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Trade'i kapatır, DB'yi günceller
   * @param {Object} trade
   * @param {number} closePrice
   * @param {number} pnl
   * @param {number} pnlPercent
   * @param {string} closeReason - 'TP' | 'SL' | 'MANUAL'
   */
  async closeTrade(trade, closePrice, pnl, pnlPercent, closeReason) {
    try {
      const closeTime = new Date();

      await db.execute(
        `UPDATE trades
         SET status       = 'CLOSED',
             pnl          = ?,
             pnl_percent  = ?,
             close_time   = ?,
             close_reason = ?,
             updated_at   = ?
         WHERE id = ?`,
        [pnl, pnlPercent, closeTime, closeReason, closeTime, trade.id]
      );

      this.openTrades.delete(trade.symbol);
      
      // Bakiye geçmişini güncelle
      await this.updateBalanceHistory(pnl, `${trade.symbol} ${closeReason}`, trade.id);

      const emoji = pnl >= 0 ? '🟢' : '🔴';
      await Logger.info('TradeEngine',
        `${emoji} Trade kapatıldı: ${trade.symbol} ${trade.direction} | ${closeReason} | PnL: $${pnl.toFixed(4)} (${pnlPercent.toFixed(2)}%)`
      );

    } catch (error) {
      await Logger.error('TradeEngine', `Trade kapatılamadı: ${trade.id}`, error.message);
    }
  }

  /**
   * Tüm açık trade'leri manuel olarak kapatır
   */
  async closeAllTrades() {
    const trades = Array.from(this.openTrades.values());
    await Logger.warn('TradeEngine', `⚠️ MANUEL MÜDAHALE: ${trades.length} trade kapatılıyor...`);

    for (const trade of trades) {
      try {
        let currentPrice = binanceService.getPrice(trade.symbol);
        if (!currentPrice) {
          currentPrice = await binanceService.fetchPrice(trade.symbol);
        }
        
        if (currentPrice) {
          const { pnl, pnlPercent } = this._calculatePnL(trade, currentPrice);
          await this.closeTrade(trade, currentPrice, pnl, pnlPercent, 'MANUAL');
        } else {
          // Fiyat alınamazsa giriş fiyatından kapat (teorik)
          await this.closeTrade(trade, trade.entry_price, 0, 0, 'MANUAL');
        }
      } catch (err) {
        await Logger.error('TradeEngine', `${trade.symbol} kapatılırken hata:`, err.message);
      }
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Hesaplamalar
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PnL hesaplar (kaldıraçsız spot benzeri hesap)
   * @param {Object} trade
   * @param {number} currentPrice
   * @returns {{pnl: number, pnlPercent: number}}
   */
  _calculatePnL(trade, currentPrice) {
    const entryPrice = trade.entry_price;
    const quantity   = trade.quantity;

    let priceDiff;
    if (trade.direction === 'LONG') {
      priceDiff = currentPrice - entryPrice;
    } else {
      priceDiff = entryPrice - currentPrice;
    }

    const pnl        = priceDiff * quantity;
    const pnlPercent = (priceDiff / entryPrice) * 100;

    return {
      pnl:        parseFloat(pnl.toFixed(8)),
      pnlPercent: parseFloat(pnlPercent.toFixed(4))
    };
  }

  /**
   * DB'deki PnL sütunlarını günceller (sessiz)
   */
  async _updatePnL(tradeId, pnl, pnlPercent) {
    try {
      await db.execute(
        'UPDATE trades SET pnl = ?, pnl_percent = ?, updated_at = ? WHERE id = ?',
        [pnl, pnlPercent, new Date(), tradeId]
      );
    } catch (_) { /* Sessiz — kritik değil */ }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /** Açık trade map'ini döndürür (signalEngine duplicate guard için) */
  getOpenTradesMap() {
    return this.openTrades;
  }

  /** Açık trade listesini döndürür */
  getOpenTrades() {
    return Array.from(this.openTrades.values());
  }

  /** İstatistikler */
  getStats() {
    const trades   = this.getOpenTrades();
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    return {
      openTradesCount: trades.length,
      totalUnrealizedPnL: totalPnL,
      maxOpenTrades: this.maxOpenTrades
    };
  }

  /** Durum */
  getStatus() {
    return {
      isRunning: this.isRunning,
      ...this.getStats()
    };
  }

  /** Motor durdurma */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isRunning = false;
    Logger.info('TradeEngine', 'Trade motoru durduruldu');
  }
}

module.exports = new TradeEngine();