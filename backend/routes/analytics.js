const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');

// GET /api/analytics/performance
router.get('/performance', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { period = 30 } = req.query;
    const dateFrom = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const daily = await Trade.aggregate([
      {
        $match: {
          user_id: userId,
          status: 'closed',
          closed_at: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$closed_at' } },
          trade_count: { $sum: 1 },
          wins: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $lte: ['$pnl', 0] }, 1, 0] } },
          total_pnl: { $sum: '$pnl' },
          avg_pnl: { $avg: '$pnl' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(daily);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/symbols
router.get('/symbols', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const symbolStats = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed' } },
      {
        $group: {
          _id: '$symbol',
          total_trades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $lte: ['$pnl', 0] }, 1, 0] } },
          total_pnl: { $sum: '$pnl' },
          avg_pnl_percent: { $avg: '$pnl_percentage' },
          best_trade: { $max: '$pnl' },
          worst_trade: { $min: '$pnl' }
        }
      },
      { $sort: { total_pnl: -1 } }
    ]);

    res.json(symbolStats);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/direction
router.get('/direction', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const dirStats = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed' } },
      {
        $group: {
          _id: '$side',
          total_trades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $lte: ['$pnl', 0] }, 1, 0] } },
          total_pnl: { $sum: '$pnl' }
        }
      }
    ]);

    const formatted = dirStats.map(d => ({
      side: d._id,
      total_trades: d.total_trades,
      wins: d.wins,
      losses: d.losses,
      win_rate: ((d.wins / d.total_trades) * 100).toFixed(2),
      total_pnl: d.total_pnl.toFixed(2)
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/summary
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const summary = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed' } },
      {
        $group: {
          _id: null,
          total_trades: { $sum: 1 },
          total_wins: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          total_losses: { $sum: { $cond: [{ $lte: ['$pnl', 0] }, 1, 0] } },
          total_pnl: { $sum: '$pnl' },
          avg_pnl: { $avg: '$pnl' }
        }
      }
    ]);

    if (summary.length === 0) {
      return res.json({
        total_trades: 0,
        total_wins: 0,
        total_losses: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_pnl: 0
      });
    }

    const data = summary[0];
    res.json({
      total_trades: data.total_trades,
      total_wins: data.total_wins,
      total_losses: data.total_losses,
      win_rate: ((data.total_wins / data.total_trades) * 100).toFixed(2),
      total_pnl: data.total_pnl.toFixed(2),
      avg_pnl: data.avg_pnl.toFixed(2)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
        SUM(pnl) as total_pnl,
        AVG(pnl_percent) as avg_pnl_percent,
        MAX(pnl) as best_trade,
        MIN(pnl) as worst_trade,
        AVG(TIMESTAMPDIFF(MINUTE, open_time, close_time)) as avg_trade_duration,
        AVG(risk_reward_ratio) as avg_risk_reward
       FROM trades WHERE status = 'CLOSED'`
    );

    // Max Drawdown hesapla
    const [balanceHistory] = await db.execute(
      'SELECT balance FROM balance_history ORDER BY recorded_at ASC'
    );

    let maxDrawdown = 0;
    let peak = 0;
    for (const bh of balanceHistory) {
      const bal = parseFloat(bh.balance);
      if (bal > peak) peak = bal;
      const dd = ((peak - bal) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Win/Loss serileri
    const [trades] = await db.execute(
      `SELECT pnl FROM trades WHERE status = 'CLOSED' ORDER BY close_time ASC`
    );

    let currentWin = 0, currentLoss = 0, bestStreak = 0, worstStreak = 0;
    for (const t of trades) {
      if (parseFloat(t.pnl) > 0) {
        currentWin++;
        currentLoss = 0;
        bestStreak = Math.max(bestStreak, currentWin);
      } else {
        currentLoss++;
        currentWin = 0;
        worstStreak = Math.max(worstStreak, currentLoss);
      }
    }

    // TP kırılımı
    const [tpBreakdown] = await db.execute(
      `SELECT close_reason as result_type, COUNT(*) as count, SUM(pnl) as total_pnl
       FROM trades WHERE status = 'CLOSED' AND close_reason = 'TP'
       GROUP BY close_reason`
    );

    res.json({
      ...summary[0],
      maxDrawdown,
      bestStreak,
      worstStreak,
      tpBreakdown
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/export
router.get('/export', async (req, res, next) => {
  try {
    const [trades] = await db.execute(
      `SELECT symbol, direction, entry_price, exit_price, stop_loss,
              take_profit_1, position_size, leverage, commission,
              pnl, pnl_percent, result_type, opened_at, closed_at
       FROM paper_trades WHERE status = 'CLOSED'
       ORDER BY closed_at DESC`
    );

    // CSV header
    const headers = Object.keys(trades[0] || {}).join(',');
    const rows = trades.map(t => Object.values(t).join(','));
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=trade_history.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
