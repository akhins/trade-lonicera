const Logger = require('../utils/logger');
const db = require('../config/database');
const binanceService = require('./binanceService');

/**
 * Paper Trading Engine
 * Sanal bakiye ile demo trading yönetimi
 * GERÇEK İŞLEM AÇILMAZ - Sadece simülasyon
 */
class PaperTradingEngine {
  constructor() {
    this.balance = 10000;
    this.initialBalance = 10000;
    this.riskPercent = 2;
    this.commissionRate = 0.04; // %0.04
    this.slippage = 0;
    this.maxOpenTrades = 10;
    this.io = null;
    this.openTrades = new Map();
  }

  /**
   * Engine'i başlatır, ayarları DB'den yükler
   */
  async initialize(io = null) {
    this.io = io;

    try {
      // Ayarları yükle
      const [settings] = await db.execute('SELECT setting_key, setting_value FROM settings');
      const config = {};
      settings.forEach(s => { config[s.setting_key] = s.setting_value; });

      this.initialBalance = parseFloat(config.paper_balance || 10000);
      this.riskPercent = parseFloat(config.risk_percent || 2);
      this.commissionRate = parseFloat(config.commission_rate || 0.04);
      this.slippage = parseFloat(config.slippage || 0);
      this.maxOpenTrades = parseInt(config.max_open_trades || 10);

      // Mevcut bakiyeyi hesapla
      await this.calculateCurrentBalance();

      // Açık trade'leri yükle
      await this.loadOpenTrades();

      await Logger.info('PaperTrading', `Engine başlatıldı. Bakiye: $${this.balance.toFixed(2)}`);
    } catch (error) {
      await Logger.error('PaperTrading', 'Engine başlatılamadı', error.message);
    }
  }

  /**
   * Mevcut bakiyeyi hesaplar
   */
  async calculateCurrentBalance() {
    try {
      const [rows] = await db.execute(
        'SELECT balance FROM balance_history ORDER BY recorded_at DESC LIMIT 1'
      );

      if (rows.length > 0) {
        this.balance = parseFloat(rows[0].balance);
      } else {
        this.balance = this.initialBalance;
        // İlk bakiye kaydını ekle
        await db.execute(
          'INSERT INTO balance_history (balance, change_amount, change_reason) VALUES (?, 0, ?)',
          [this.balance, 'Başlangıç bakiyesi']
        );
      }
    } catch (error) {
      this.balance = this.initialBalance;
    }
  }

  /**
   * Açık trade'leri DB'den yükler
   */
  async loadOpenTrades() {
    try {
      const [trades] = await db.execute(
        'SELECT * FROM paper_trades WHERE status = ?', ['OPEN']
      );

      for (const trade of trades) {
        this.openTrades.set(trade.id, trade);
      }

      await Logger.info('PaperTrading', `${trades.length} açık trade yüklendi`);
    } catch (error) {
      await Logger.error('PaperTrading', 'Açık trade\'ler yüklenemedi', error.message);
    }
  }

  /**
   * Yeni paper trade açar
   */
  async openTrade({ signalId, symbol, direction, entryPrice, stopLoss, takeProfits, leverage = 10 }) {
    try {
      // Max açık trade kontrolü
      if (this.openTrades.size >= this.maxOpenTrades) {
        await Logger.warn('PaperTrading', `Max açık trade sayısına ulaşıldı (${this.maxOpenTrades})`);
        return null;
      }

      // Risk bazlı pozisyon boyutu hesapla
      const riskAmount = this.balance * (this.riskPercent / 100);
      const priceDiff = Math.abs(entryPrice - stopLoss);
      if (priceDiff === 0) {
        await Logger.warn('PaperTrading', 'Entry ve SL aynı - trade açılamıyor');
        return null;
      }

      const positionSize = (riskAmount / priceDiff) * entryPrice;

      // Slippage uygulanabilir
      let adjustedEntry = entryPrice;
      if (this.slippage > 0) {
        const slippageAmount = entryPrice * (this.slippage / 100);
        adjustedEntry = direction === 'LONG' 
          ? entryPrice + slippageAmount 
          : entryPrice - slippageAmount;
      }

      // Komisyon hesapla
      const commission = positionSize * (this.commissionRate / 100);

      // Trade kaydı oluştur
      const [result] = await db.execute(
        `INSERT INTO paper_trades 
         (signal_id, symbol, direction, entry_price, stop_loss, 
          take_profit_1, take_profit_2, take_profit_3, take_profit_4,
          position_size, leverage, commission, slippage, status, risk_amount, opened_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, NOW())`,
        [
          signalId, symbol, direction, adjustedEntry, stopLoss,
          takeProfits[0] || null, takeProfits[1] || null,
          takeProfits[2] || null, takeProfits[3] || null,
          positionSize, leverage, commission, this.slippage > 0 ? Math.abs(adjustedEntry - entryPrice) : 0,
          riskAmount
        ]
      );

      const trade = {
        id: result.insertId,
        signal_id: signalId,
        symbol,
        direction,
        entry_price: adjustedEntry,
        stop_loss: stopLoss,
        take_profit_1: takeProfits[0] || null,
        take_profit_2: takeProfits[1] || null,
        take_profit_3: takeProfits[2] || null,
        take_profit_4: takeProfits[3] || null,
        position_size: positionSize,
        leverage,
        commission,
        status: 'OPEN',
        risk_amount: riskAmount,
        opened_at: new Date()
      };

      this.openTrades.set(trade.id, trade);

      // Komisyonu bakiyeden düş
      this.balance -= commission;
      await this.updateBalance(-commission, 'Komisyon', trade.id);

      // Pozisyonlar tablosuna da ekle (uyumluluk)
      await db.execute(
        `INSERT INTO pozisyonlar (parite, entry_price, stop_price, tp_price, LONGSHORT, status)
         VALUES (?, ?, ?, ?, ?, 'OPEN')`,
        [symbol, String(adjustedEntry), String(stopLoss), String(takeProfits[0] || ''), direction]
      );

      await Logger.info('PaperTrading', 
        `Trade açıldı: ${symbol} ${direction} @ ${adjustedEntry} | Size: $${positionSize.toFixed(2)} | Risk: $${riskAmount.toFixed(2)}`
      );

      return trade;
    } catch (error) {
      await Logger.error('PaperTrading', `Trade açılamadı: ${symbol}`, error.message);
      throw error;
    }
  }

  /**
   * Açık trade'lerin TP/SL kontrolü
   */
  async monitorOpenTrades() {
    for (const [tradeId, trade] of this.openTrades) {
      try {
        const currentPrice = binanceService.getPrice(trade.symbol);
        if (!currentPrice) continue;

        // Current price güncelle
        await db.execute(
          'UPDATE paper_trades SET current_price = ? WHERE id = ?',
          [currentPrice, tradeId]
        );

        const entryPrice = parseFloat(trade.entry_price);
        const stopLoss = parseFloat(trade.stop_loss);
        const tp1 = trade.take_profit_1 ? parseFloat(trade.take_profit_1) : null;
        const tp2 = trade.take_profit_2 ? parseFloat(trade.take_profit_2) : null;
        const tp3 = trade.take_profit_3 ? parseFloat(trade.take_profit_3) : null;
        const tp4 = trade.take_profit_4 ? parseFloat(trade.take_profit_4) : null;

        if (trade.direction === 'LONG') {
          // LONG - SL check
          if (currentPrice <= stopLoss) {
            await this.closeTrade(tradeId, currentPrice, 'SL');
            continue;
          }
          // LONG - TP checks (en yüksek TP'den kontrol)
          if (tp4 && currentPrice >= tp4) { await this.closeTrade(tradeId, currentPrice, 'TP4'); continue; }
          if (tp3 && currentPrice >= tp3) { await this.closeTrade(tradeId, currentPrice, 'TP3'); continue; }
          if (tp2 && currentPrice >= tp2) { await this.closeTrade(tradeId, currentPrice, 'TP2'); continue; }
          if (tp1 && currentPrice >= tp1) { await this.closeTrade(tradeId, currentPrice, 'TP1'); continue; }
        } else {
          // SHORT - SL check
          if (currentPrice >= stopLoss) {
            await this.closeTrade(tradeId, currentPrice, 'SL');
            continue;
          }
          // SHORT - TP checks
          if (tp4 && currentPrice <= tp4) { await this.closeTrade(tradeId, currentPrice, 'TP4'); continue; }
          if (tp3 && currentPrice <= tp3) { await this.closeTrade(tradeId, currentPrice, 'TP3'); continue; }
          if (tp2 && currentPrice <= tp2) { await this.closeTrade(tradeId, currentPrice, 'TP2'); continue; }
          if (tp1 && currentPrice <= tp1) { await this.closeTrade(tradeId, currentPrice, 'TP1'); continue; }
        }

        // WebSocket ile güncelle
        if (this.io) {
          const pnl = this.calculatePnl(trade, currentPrice);
          this.io.emit('tradeUpdate', {
            tradeId,
            symbol: trade.symbol,
            currentPrice,
            pnl: pnl.amount,
            pnlPercent: pnl.percent
          });
        }
      } catch (error) {
        // Sessiz hata
      }
    }
  }

  /**
   * PnL hesaplar
   */
  calculatePnl(trade, currentPrice) {
    const entryPrice = parseFloat(trade.entry_price);
    const positionSize = parseFloat(trade.position_size);
    const commission = parseFloat(trade.commission || 0);

    let pnlPercent;
    if (trade.direction === 'LONG') {
      pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    } else {
      pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
    }

    const pnlAmount = (positionSize * pnlPercent / 100) - commission;

    return {
      amount: pnlAmount,
      percent: pnlPercent
    };
  }

  /**
   * Trade kapatır
   */
  async closeTrade(tradeId, exitPrice, resultType) {
    try {
      const trade = this.openTrades.get(tradeId);
      if (!trade) return;

      const pnl = this.calculatePnl(trade, exitPrice);

      // Kapanış komisyonu
      const closingCommission = parseFloat(trade.position_size) * (this.commissionRate / 100);
      const netPnl = pnl.amount - closingCommission;

      // DB güncelle
      await db.execute(
        `UPDATE paper_trades SET 
          status = 'CLOSED', exit_price = ?, pnl = ?, pnl_percent = ?,
          result_type = ?, reward_amount = ?, closed_at = NOW(), commission = commission + ?
         WHERE id = ?`,
        [exitPrice, netPnl, pnl.percent, resultType, netPnl > 0 ? netPnl : 0, closingCommission, tradeId]
      );

      // Pozisyonlar tablosunu güncelle (uyumluluk)
      await db.execute(
        `UPDATE pozisyonlar SET status = 'CLOSED' WHERE parite = ? AND status = 'OPEN' AND LONGSHORT = ?`,
        [trade.symbol, trade.direction]
      );

      // Bakiye güncelle
      this.balance += netPnl;
      await this.updateBalance(netPnl, `${trade.symbol} ${resultType}`, tradeId);

      // Trade'i açık listeden kaldır
      this.openTrades.delete(tradeId);

      // WebSocket bildir
      if (this.io) {
        this.io.emit('tradeClosed', {
          tradeId,
          symbol: trade.symbol,
          direction: trade.direction,
          entryPrice: trade.entry_price,
          exitPrice,
          pnl: netPnl,
          pnlPercent: pnl.percent,
          resultType,
          balance: this.balance
        });
      }

      const emoji = netPnl >= 0 ? '🟢' : '🔴';
      await Logger.info('PaperTrading',
        `${emoji} Trade kapatıldı: ${trade.symbol} ${trade.direction} | ${resultType} | PnL: $${netPnl.toFixed(2)} (${pnl.percent.toFixed(2)}%) | Bakiye: $${this.balance.toFixed(2)}`
      );

      return { tradeId, pnl: netPnl, resultType };
    } catch (error) {
      await Logger.error('PaperTrading', `Trade kapatılamadı: ${tradeId}`, error.message);
      throw error;
    }
  }

  /**
   * Bakiye güncellemesi kaydeder
   */
  async updateBalance(changeAmount, reason, tradeId = null) {
    try {
      await db.execute(
        'INSERT INTO balance_history (balance, change_amount, change_reason, trade_id) VALUES (?, ?, ?, ?)',
        [this.balance, changeAmount, reason, tradeId]
      );
    } catch (error) {
      await Logger.error('PaperTrading', 'Bakiye güncellenemedi', error.message);
    }
  }

  /**
   * Engine durumunu döndürür
   */
  getStatus() {
    return {
      balance: this.balance,
      initialBalance: this.initialBalance,
      openTradeCount: this.openTrades.size,
      riskPercent: this.riskPercent,
      commissionRate: this.commissionRate,
      pnl: this.balance - this.initialBalance,
      pnlPercent: ((this.balance - this.initialBalance) / this.initialBalance * 100)
    };
  }

  /**
   * Tüm açık trade'leri döndürür
   */
  getOpenTrades() {
    return Array.from(this.openTrades.values());
  }

  /**
   * Engine'i durdurur
   */
  stop() {
    // Engine doesn't have any intervals to clean up
    // But we keep this method for consistency with other engines
    Logger.info('PaperTrading', 'Paper Trading Engine durduruldu');
  }
}

module.exports = new PaperTradingEngine();
