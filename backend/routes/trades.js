const express = require('express');
const router = express.Router();
const db = require('../config/database');
const binanceService = require('../services/binanceService');

// GET /api/trades/open
router.get('/open', async (req, res, next) => {
  try {
    const [trades] = await db.execute(
      `SELECT t.* 
       FROM trades t
       WHERE t.status = 'OPEN' 
       ORDER BY t.open_time DESC`
    );

    // Güncel fiyatları ekle
    const enriched = trades.map(t => {
      const currentPrice = binanceService.getPrice(t.symbol);
      const entryPrice = parseFloat(t.entry_price);
      const quantity = parseFloat(t.quantity);
      const stopLoss = parseFloat(t.stop_loss);
      const riskAmount = quantity * Math.abs(entryPrice - stopLoss);
      const positionSizeUSD = quantity * entryPrice;

      if (currentPrice) {
        if (t.direction === 'LONG') {
          pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        } else {
          pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
        }
        const valDiff = t.direction === 'LONG' ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
        pnl = valDiff * quantity;
      } else {
        pnl = t.pnl || 0;
        pnlPercent = t.pnl_percent || 0;
      }

      return {
        ...t,
        opened_at: t.open_time,
        position_size: positionSizeUSD, // Notional in USD
        units: quantity,               // Quantity in coins
        risk_amount: riskAmount,       // Calculated risk in USD
        current_price: currentPrice || entryPrice,
        unrealized_pnl: pnl,
        unrealized_pnl_percent: pnlPercent
      };
    });

    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

// GET /api/trades/history
router.get('/history', async (req, res, next) => {
  try {
    const { symbol, result_type, limit = 50, offset = 0 } = req.query;

    let query = `SELECT * FROM trades WHERE status = 'CLOSED'`;
    const params = [];

    if (symbol) { query += ' AND symbol = ?'; params.push(symbol); }
    if (result_type) { query += ' AND close_reason = ?'; params.push(result_type); }

    query += ' ORDER BY close_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [trades] = await db.execute(query, params);
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM trades WHERE status = 'CLOSED'`
    );

    const formatted = trades.map(t => ({
      ...t,
      opened_at: t.open_time,
      closed_at: t.close_time,
      result_type: t.close_reason,
      position_size: t.quantity
    }));

    res.json({ trades: formatted, total: countResult[0].total });
  } catch (error) {
    next(error);
  }
});

// GET /api/trades/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [trades] = await db.execute('SELECT * FROM trades WHERE id = ?', [req.params.id]);
    if (trades.length === 0) return res.status(404).json({ error: 'Trade bulunamadı' });

    const trade = trades[0];
    const currentPrice = binanceService.getPrice(trade.symbol);

    res.json({ 
      ...trade, 
      opened_at: trade.open_time,
      closed_at: trade.close_time,
      result_type: trade.close_reason,
      position_size: trade.quantity,
      current_price: currentPrice 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/trades/chart/:symbol - TradingView chart verisi
router.get('/chart/:symbol', async (req, res, next) => {
  try {
    const { interval = '15m', limit = 200 } = req.query;
    const klines = await binanceService.fetchKlines(req.params.symbol, interval, parseInt(limit));

    // Aynı sembol için trade'leri çek
    const [trades] = await db.execute(
      `SELECT * FROM trades WHERE symbol = ? ORDER BY open_time DESC LIMIT 20`,
      [req.params.symbol]
    );

    res.json({ klines, trades, signals: trades }); // Sinyal yerine trade veriyoruz
  } catch (error) {
    next(error);
  }
});

// POST /api/trades/manual - Manuel işlem aç (test amaçlı)
router.post('/manual', async (req, res, next) => {
  try {
    const { symbol, direction = 'LONG', leverage = 5 } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Parite (symbol) gerekli' });
    }

    // Binance'den güncel fiyat çek
    const currentPrice = await binanceService.fetchPrice(symbol);
    if (!currentPrice) {
      return res.status(400).json({ error: `${symbol} fiyatı alınamadı` });
    }

    // SL ve TP'yi %2 ve %6 olarak hesapla (1:3 RR)
    const stopLossPercent = 0.02;
    const takeProfitPercent = 0.06;
    
    let stopLoss, takeProfit;
    if (direction === 'LONG') {
      stopLoss = currentPrice * (1 - stopLossPercent);
      takeProfit = currentPrice * (1 + takeProfitPercent);
    } else {
      stopLoss = currentPrice * (1 + stopLossPercent);
      takeProfit = currentPrice * (1 - takeProfitPercent);
    }

    // Sinyal objesi oluştur
    const signal = {
      symbol,
      direction,
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio: 3,
      leverage,
      signalReason: `Manual test işlem: ${direction} @ ${currentPrice}`,
      indicatorValues: JSON.stringify({ manual: true })
    };

    // Trade motorunu çağır
    const tradeEngine = require('../services/tradeEngine');
    const opened = await tradeEngine.openTrade(signal);

    if (!opened) {
      return res.status(400).json({ error: 'İşlem açılamadı (zaten açık trade veya limit aşıldı)' });
    }

    res.json({ 
      success: true, 
      message: `${direction} işlem açıldı: ${symbol}`,
      trade: {
        symbol,
        direction,
        entry_price: currentPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        leverage,
        notional: `${(250 * leverage).toFixed(2)} USDT`
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/trades/close-all - Tüm açık işlemleri kapat
router.post('/close-all', async (req, res, next) => {
  try {
    const tradeEngine = require('../services/tradeEngine');
    const count = tradeEngine.getOpenTrades().length;
    
    if (count === 0) {
      return res.json({ success: true, message: 'Kapatılacak açık işlem yok.' });
    }

    await tradeEngine.closeAllTrades();

    res.json({ 
      success: true, 
      message: `Tüm işlemler (${count} adet) başarıyla kapatıldı.` 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
