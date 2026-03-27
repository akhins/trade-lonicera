const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');
const binanceService = require('../services/binanceService');

// GET /api/trades/open
router.get('/open', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const trades = await Trade.find({ user_id: userId, status: 'open' })
      .sort({ opened_at: -1 })
      .lean();

    const enriched = trades.map(t => {
      const currentPrice = binanceService.getPrice(t.symbol);
      const entryPrice = t.entry_price;
      const quantity = t.quantity;
      const stopLoss = t.stop_loss;
      const riskAmount = quantity * Math.abs(entryPrice - stopLoss);
      const positionSizeUSD = quantity * entryPrice;

      let pnl = t.pnl || 0;
      let pnlPercent = t.pnl_percentage || 0;

      if (currentPrice) {
        const valDiff = t.side === 'LONG' 
          ? (currentPrice - entryPrice) 
          : (entryPrice - currentPrice);
        pnl = valDiff * quantity;
        pnlPercent = ((valDiff / entryPrice) * 100).toFixed(2);
      }

      return {
        ...t,
        position_size: positionSizeUSD,
        units: quantity,
        risk_amount: riskAmount,
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
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { symbol, limit = 50, offset = 0 } = req.query;

    const query = { user_id: userId, status: 'closed' };
    if (symbol) query.symbol = symbol;

    const trades = await Trade.find(query)
      .sort({ closed_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await Trade.countDocuments(query);

    res.json({ 
      trades: trades.map(t => ({
        ...t,
        position_size: t.quantity
      })), 
      total 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/trades/:id
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const trade = await Trade.findOne({ _id: req.params.id, user_id: userId }).lean();
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    const currentPrice = binanceService.getPrice(trade.symbol);

    res.json({ 
      ...trade, 
      current_price: currentPrice,
      position_size: trade.quantity
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/trades/stats/:timeframe
router.get('/stats/:timeframe', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { timeframe = '24h' } = req.params;
    
    let dateFrom = new Date();
    if (timeframe === '24h') dateFrom.setHours(dateFrom.getHours() - 24);
    else if (timeframe === '7d') dateFrom.setDate(dateFrom.getDate() - 7);
    else if (timeframe === '30d') dateFrom.setDate(dateFrom.getDate() - 30);

    const stats = await Trade.aggregate([
      {
        $match: {
          user_id: userId,
          status: 'closed',
          closed_at: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: null,
          total_trades: { $sum: 1 },
          winning_trades: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          losing_trades: { $sum: { $cond: [{ $lt: ['$pnl', 0] }, 1, 0] } },
          total_pnl: { $sum: '$pnl' },
          avg_pnl: { $avg: '$pnl' },
          max_win: { $max: '$pnl' },
          max_loss: { $min: '$pnl' }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        timeframe,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_pnl: 0
      });
    }

    const data = stats[0];
    res.json({
      timeframe,
      total_trades: data.total_trades,
      winning_trades: data.winning_trades,
      losing_trades: data.losing_trades,
      win_rate: ((data.winning_trades / data.total_trades) * 100).toFixed(2),
      total_pnl: parseFloat(data.total_pnl.toFixed(2)),
      avg_pnl: parseFloat(data.avg_pnl.toFixed(2)),
      max_win: parseFloat(data.max_win.toFixed(2)),
      max_loss: parseFloat(data.max_loss.toFixed(2))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/trades - Create mock trade (for testing)
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { symbol, side, entry_price, quantity, stop_loss, take_profit } = req.body;

    if (!symbol || !side || !entry_price || !quantity || !stop_loss || !take_profit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const trade = new Trade({
      user_id: userId,
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      entry_price,
      quantity,
      stop_loss,
      take_profit,
      status: 'open'
    });

    await trade.save();
    res.status(201).json(trade);
  } catch (error) {
    next(error);
  }
});

// PUT /api/trades/:id - Update trade
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, user_id: userId },
      req.body,
      { new: true }
    );

    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    res.json(trade);
  } catch (error) {
    next(error);
  }
});

// POST /api/trades/:id/close - Close a trade
router.post('/:id/close', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { exit_price } = req.body;
    if (!exit_price) return res.status(400).json({ error: 'exit_price required' });

    const trade = await Trade.findOne({ _id: req.params.id, user_id: userId });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    const pnl = trade.side === 'LONG'
      ? (exit_price - trade.entry_price) * trade.quantity
      : (trade.entry_price - exit_price) * trade.quantity;

    const pnl_percentage = ((pnl / (trade.entry_price * trade.quantity)) * 100).toFixed(2);

    trade.exit_price = exit_price;
    trade.pnl = pnl;
    trade.pnl_percentage = pnl_percentage;
    trade.status = 'closed';
    trade.closed_at = new Date();

    await trade.save();
    res.json(trade);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
