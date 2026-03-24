const express = require('express');
const router = express.Router();
const db = require('../config/database');
const binanceService = require('../services/binanceService');
const paperTradingEngine = require('../services/paperTradingEngine');
const telegramService = require('../services/telegramService');
const strategyEngine = require('../services/strategyEngine');

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    // Bakiye ve PnL
    const balance = paperTradingEngine.balance;
    const initialBalance = paperTradingEngine.initialBalance;
    const totalPnl = balance - initialBalance;
    const totalPnlPercent = (totalPnl / initialBalance) * 100;

    // Açık trade sayısı
    const [openTrades] = await db.execute('SELECT COUNT(*) as count FROM paper_trades WHERE status = ?', ['OPEN']);
    
    // Kapalı trade sayısı
    const [closedTrades] = await db.execute('SELECT COUNT(*) as count FROM paper_trades WHERE status = ?', ['CLOSED']);
    
    // Win rate
    const [wins] = await db.execute('SELECT COUNT(*) as count FROM paper_trades WHERE status = ? AND pnl > 0', ['CLOSED']);
    const winRate = closedTrades[0].count > 0 ? (wins[0].count / closedTrades[0].count * 100) : 0;

    // Günlük PnL
    const [dailyPnl] = await db.execute(
      `SELECT COALESCE(SUM(pnl), 0) as total FROM paper_trades 
       WHERE status = 'CLOSED' AND closed_at >= CURDATE()`
    );

    // Haftalık PnL
    const [weeklyPnl] = await db.execute(
      `SELECT COALESCE(SUM(pnl), 0) as total FROM paper_trades 
       WHERE status = 'CLOSED' AND closed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );

    // Aylık PnL
    const [monthlyPnl] = await db.execute(
      `SELECT COALESCE(SUM(pnl), 0) as total FROM paper_trades 
       WHERE status = 'CLOSED' AND closed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    // Ortalama risk/reward
    const [avgRR] = await db.execute(
      `SELECT AVG(ABS(reward_amount / NULLIF(risk_amount, 0))) as avg_rr 
       FROM paper_trades WHERE status = 'CLOSED' AND risk_amount > 0`
    );

    // Toplam sinyal sayısı
    const [totalSignals] = await db.execute('SELECT COUNT(*) as count FROM signals');

    res.json({
      balance,
      initialBalance,
      totalPnl,
      totalPnlPercent,
      openTradeCount: openTrades[0].count,
      closedTradeCount: closedTrades[0].count,
      winRate,
      dailyPnl: parseFloat(dailyPnl[0].total),
      weeklyPnl: parseFloat(weeklyPnl[0].total),
      monthlyPnl: parseFloat(monthlyPnl[0].total),
      avgRiskReward: avgRR[0].avg_rr || 0,
      totalSignals: totalSignals[0].count
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/recent-trades
router.get('/recent-trades', async (req, res, next) => {
  try {
    const [trades] = await db.execute(
      `SELECT * FROM paper_trades ORDER BY opened_at DESC LIMIT 10`
    );
    res.json(trades);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/recent-signals
router.get('/recent-signals', async (req, res, next) => {
  try {
    const [signals] = await db.execute(
      `SELECT s.*, tm.raw_text 
       FROM signals s 
       LEFT JOIN telegram_messages tm ON s.telegram_message_id = tm.id 
       ORDER BY s.created_at DESC LIMIT 10`
    );
    res.json(signals);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/top-pairs
router.get('/top-pairs', async (req, res, next) => {
  try {
    // En iyi performans
    const [topPairs] = await db.execute(
      `SELECT symbol, COUNT(*) as trade_count, SUM(pnl) as total_pnl, 
              AVG(pnl_percent) as avg_pnl_percent
       FROM paper_trades WHERE status = 'CLOSED'
       GROUP BY symbol ORDER BY total_pnl DESC LIMIT 5`
    );

    // En kötü performans
    const [worstPairs] = await db.execute(
      `SELECT symbol, COUNT(*) as trade_count, SUM(pnl) as total_pnl,
              AVG(pnl_percent) as avg_pnl_percent
       FROM paper_trades WHERE status = 'CLOSED'
       GROUP BY symbol ORDER BY total_pnl ASC LIMIT 5`
    );

    res.json({ topPairs, worstPairs });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/market-overview
router.get('/market-overview', async (req, res, next) => {
  try {
    const movers = await binanceService.fetchTopMovers(10);
    res.json(movers);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/system-status
router.get('/system-status', async (req, res, next) => {
  try {
    let dbConnected = false;
    try {
      await db.execute('SELECT 1');
      dbConnected = true;
    } catch (e) {}

    res.json({
      telegram: telegramService.getStatus(),
      binance: binanceService.getStatus(),
      database: { connected: dbConnected },
      strategy: strategyEngine.getStatus(),
      paperTrading: paperTradingEngine.getStatus()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/pnl-chart
router.get('/pnl-chart', async (req, res, next) => {
  try {
    const [history] = await db.execute(
      `SELECT balance, change_amount, change_reason, recorded_at 
       FROM balance_history ORDER BY recorded_at ASC`
    );
    res.json(history);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
