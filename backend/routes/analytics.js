const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/analytics/performance
router.get('/performance', async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days

    // Günlük performans
    const [daily] = await db.execute(
      `SELECT DATE(close_time) as date,
              COUNT(*) as trade_count,
              SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN pnl <= 0 THEN 1 ELSE 0 END) as losses,
              SUM(pnl) as total_pnl,
              AVG(pnl) as avg_pnl,
              AVG(pnl_percent) as avg_pnl_percent
       FROM trades 
       WHERE status = 'CLOSED' AND close_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(close_time) ORDER BY date ASC`,
      [parseInt(period)]
    );

    res.json(daily);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/symbols
router.get('/symbols', async (req, res, next) => {
  try {
    const [symbolStats] = await db.execute(
      `SELECT symbol,
              COUNT(*) as total_trades,
              SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN pnl <= 0 THEN 1 ELSE 0 END) as losses,
              SUM(pnl) as total_pnl,
              AVG(pnl_percent) as avg_pnl_percent,
              MAX(pnl) as best_trade,
              MIN(pnl) as worst_trade,
              AVG(TIMESTAMPDIFF(MINUTE, open_time, close_time)) as avg_duration_min
       FROM trades WHERE status = 'CLOSED'
       GROUP BY symbol ORDER BY total_pnl DESC`
    );

    res.json(symbolStats);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/direction
router.get('/direction', async (req, res, next) => {
  try {
    const [dirStats] = await db.execute(
      `SELECT direction,
              COUNT(*) as total_trades,
              SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN pnl <= 0 THEN 1 ELSE 0 END) as losses,
              ROUND(SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as win_rate,
              SUM(pnl) as total_pnl,
              AVG(pnl_percent) as avg_pnl_percent
       FROM trades WHERE status = 'CLOSED'
       GROUP BY direction`
    );

    res.json(dirStats);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/summary
router.get('/summary', async (req, res, next) => {
  try {
    // Genel özet
    const [summary] = await db.execute(
      `SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as total_wins,
        SUM(CASE WHEN pnl <= 0 THEN 1 ELSE 0 END) as total_losses,
        SUM(CASE WHEN close_reason = 'TP' THEN 1 ELSE 0 END) as total_tp,
        SUM(CASE WHEN close_reason = 'SL' THEN 1 ELSE 0 END) as total_sl,
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
