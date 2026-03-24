const express = require('express');
const router = express.Router();
const db = require('../config/database');
const binanceService = require('../services/binanceService');

// GET /api/trades/open
router.get('/open', async (req, res, next) => {
  try {
    const [trades] = await db.execute(
      `SELECT pt.*, s.entry_min, s.entry_max 
       FROM paper_trades pt 
       LEFT JOIN signals s ON pt.signal_id = s.id
       WHERE pt.status = 'OPEN' 
       ORDER BY pt.opened_at DESC`
    );

    // Güncel fiyatları ekle
    const enriched = trades.map(t => {
      const currentPrice = binanceService.getPrice(t.symbol);
      const entryPrice = parseFloat(t.entry_price);
      let pnl = 0;
      let pnlPercent = 0;

      if (currentPrice) {
        if (t.direction === 'LONG') {
          pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        } else {
          pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
        }
        pnl = parseFloat(t.position_size) * pnlPercent / 100;
      }

      return {
        ...t,
        current_price: currentPrice,
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

    let query = `SELECT * FROM paper_trades WHERE status = 'CLOSED'`;
    const params = [];

    if (symbol) { query += ' AND symbol = ?'; params.push(symbol); }
    if (result_type) { query += ' AND result_type = ?'; params.push(result_type); }

    query += ' ORDER BY closed_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [trades] = await db.execute(query, params);
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM paper_trades WHERE status = 'CLOSED'`
    );

    res.json({ trades, total: countResult[0].total });
  } catch (error) {
    next(error);
  }
});

// GET /api/trades/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [trades] = await db.execute('SELECT * FROM paper_trades WHERE id = ?', [req.params.id]);
    if (trades.length === 0) return res.status(404).json({ error: 'Trade bulunamadı' });

    const trade = trades[0];
    const currentPrice = binanceService.getPrice(trade.symbol);

    res.json({ ...trade, current_price: currentPrice });
  } catch (error) {
    next(error);
  }
});

// GET /api/trades/chart/:symbol - TradingView chart verisi
router.get('/chart/:symbol', async (req, res, next) => {
  try {
    const { interval = '1h', limit = 200 } = req.query;
    const klines = await binanceService.fetchKlines(req.params.symbol, interval, parseInt(limit));

    // Aynı sembol için trade'leri çek
    const [trades] = await db.execute(
      `SELECT * FROM paper_trades WHERE symbol = ? ORDER BY opened_at DESC LIMIT 20`,
      [req.params.symbol]
    );

    // Sinyalleri çek
    const [signals] = await db.execute(
      `SELECT * FROM signals WHERE symbol = ? ORDER BY created_at DESC LIMIT 20`,
      [req.params.symbol]
    );

    res.json({ klines, trades, signals });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
