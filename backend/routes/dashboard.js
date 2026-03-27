const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Logger = require('../utils/logger');
const binanceService = require('../services/binanceService');
const paperTradingEngine = require('../services/paperTradingEngine');
const telegramService = require('../services/telegramService');
const strategyEngine = require('../services/strategyEngine');
const tradeEngine = require('../services/tradeEngine');
const { getMarketSentiment } = require('../services/geminiService');

// Constants
const INITIAL_BALANCE = 10000;
const FETCH_INTERVAL_MS = 15000;
const RECENT_LIMIT = 10;

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    await Logger.info('Dashboard', 'Fetching dashboard stats...');
    // Toplam bakiye her zaman $10,000 (demo) + gerçekleşen PnL diyelim:
    const initialBalance = INITIAL_BALANCE;
    
    // Açık trade sayısı
    const [openTrades] = await db.execute('SELECT COUNT(*) as count FROM trades WHERE status = ?', ['OPEN']);
    
    // Kapalı trade sayısı
    const [closedTrades] = await db.execute('SELECT COUNT(*) as count FROM trades WHERE status = ?', ['CLOSED']);
    
    // Win rate
    const [wins] = await db.execute('SELECT COUNT(*) as count FROM trades WHERE status = ? AND pnl > 0', ['CLOSED']);
    const winRate = closedTrades[0].count > 0 ? (wins[0].count / closedTrades[0].count * 100) : 0;

    // Gerçekleşen toplam PnL
    const [totalPnlDb] = await db.execute('SELECT COALESCE(SUM(pnl), 0) as total FROM trades WHERE status = ?', ['CLOSED']);
    const totalPnl = parseFloat(totalPnlDb[0].total);
    const balance = initialBalance + totalPnl;
    const totalPnlPercent = (totalPnl / initialBalance) * 100;

    // Günlük PnL
    const [dailyPnl] = await db.execute(
      `SELECT COALESCE(SUM(pnl), 0) as total FROM trades 
       WHERE status = 'CLOSED' AND close_time >= CURDATE()`
    );

    // Haftalık PnL
    const [weeklyPnl] = await db.execute(
      `SELECT COALESCE(SUM(pnl), 0) as total FROM trades 
       WHERE status = 'CLOSED' AND close_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );

    // Aylık PnL
    const [monthlyPnl] = await db.execute(
      `SELECT COALESCE(SUM(pnl), 0) as total FROM trades 
       WHERE status = 'CLOSED' AND close_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    // Ortalama risk/reward (sistemde sabit 3, ama DB'den ortalamasını okuyalım)
    const [avgRR] = await db.execute(
      `SELECT AVG(risk_reward_ratio) as avg_rr 
       FROM trades WHERE status = 'CLOSED'`
    );

    // Toplam analiz edilen sinyal (şu an trades'e dönüşen kadarı varsayıyoruz)
    const totalSignals = openTrades[0].count + closedTrades[0].count;

    const statsData = {
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
      avgRiskReward: parseFloat(avgRR[0].avg_rr || 3),
      totalSignals: totalSignals
    };

    console.log('✅ Stats fetched successfully');
    res.json(statsData);
  } catch (error) {
    await Logger.error('Dashboard', 'Stats fetch error', error.message);
    next(error);
  }
});

// GET /api/dashboard/recent-trades
router.get('/recent-trades', async (req, res, next) => {
  try {
    const [trades] = await db.execute(
      `SELECT id, symbol, direction, entry_price, quantity AS position_size, (quantity * entry_price) AS usdt_amount, status, pnl, open_time AS opened_at, close_time AS closed_at 
       FROM trades ORDER BY open_time DESC LIMIT ?`,[RECENT_LIMIT]
    );
    
    // Açık trades'de real-time PnL hesapla
    const enriched = trades.map(trade => {
      if (trade.status === 'OPEN') {
        const currentPrice = binanceService.getPrice(trade.symbol);
        if (currentPrice) {
          const valDiff = trade.direction === 'LONG' 
            ? (currentPrice - parseFloat(trade.entry_price)) 
            : (parseFloat(trade.entry_price) - currentPrice);
          trade.pnl = valDiff * parseFloat(trade.position_size);
          trade.pnl_percent = ((valDiff / parseFloat(trade.entry_price)) * 100).toFixed(2);
        }
      }
      return trade;
    });
    
    await Logger.info('Dashboard', 'Recent trades fetched');
    res.json(enriched);
  } catch (error) {
    await Logger.error('Dashboard', 'Recent trades error', error.message);
    next(error);
  }
});

// GET /api/dashboard/recent-signals
router.get('/recent-signals', async (req, res, next) => {
  try {
    // Query from signals table if using Telegram integration
    // Otherwise fall back to trades table
    const [signals] = await db.execute(
      `SELECT id, symbol, direction, 
              COALESCE(entry_min, entry_max) as entry_price,
              stop_loss, status, created_at 
       FROM signals 
       ORDER BY created_at DESC LIMIT 10`
    );
    
    // If no signals from Telegram, fall back to recent trades
    if (signals.length === 0) {
      const [trades] = await db.execute(
        `SELECT id, symbol, direction, entry_price, stop_loss, status, open_time as created_at 
         FROM trades 
         ORDER BY open_time DESC LIMIT 10`
      );
      return res.json(trades);
    }
    
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
       FROM trades WHERE status = 'CLOSED'
       GROUP BY symbol ORDER BY total_pnl DESC LIMIT 5`
    );

    // En kötü performans
    const [worstPairs] = await db.execute(
      `SELECT symbol, COUNT(*) as trade_count, SUM(pnl) as total_pnl,
              AVG(pnl_percent) as avg_pnl_percent
       FROM trades WHERE status = 'CLOSED'
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
    await Logger.info('Dashboard', 'Fetching system status...');
    let dbConnected = false;
    try {
      await db.execute('SELECT 1');
      dbConnected = true;
    } catch (e) {}

    const tradeStats = tradeEngine.getStats();

    res.json({
      database: { connected: dbConnected },
      binance: binanceService.getStatus(),
      tradingSystem: {
        isRunning: true,
        openTrades: tradeStats.openTradesCount,
        unrealizedPnl: tradeStats.totalUnrealizedPnL
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/pnl-chart
router.get('/pnl-chart', async (req, res, next) => {
  try {
    // Geçici olarak trades tablosundan kapalı tradelerin kümülatif pnl'ini çizelim
    const [trades] = await db.execute(
      `SELECT close_time as recorded_at, pnl
       FROM trades WHERE status = 'CLOSED' ORDER BY close_time ASC`
    );
    
    let currentBalance = 10000;
    const history = trades.map(t => {
      currentBalance += parseFloat(t.pnl);
      return {
        recorded_at: t.recorded_at,
        balance: currentBalance,
        change_amount: parseFloat(t.pnl)
      };
    });

    console.log('✅ PnL Chart history fetched');
    res.json(history);
  } catch (error) {
    await Logger.error('Dashboard', 'PnL Chart error', error.message);
    next(error);
  }
});

// AI Market Sentiment (Gemini)
// GET /api/dashboard/ai-sentiment
router.get('/ai-sentiment', async (req, res, next) => {
  try {
    // Son 10 sinyal ve market movers'ı çek
    const [signals] = await db.execute(
      `SELECT id, symbol, direction, COALESCE(entry_min, entry_max) as entry_price, stop_loss, status, created_at 
       FROM signals ORDER BY created_at DESC LIMIT 10`
    );
    const market = await binanceService.fetchTopMovers(10);
    const aiResult = await getMarketSentiment({ signals, market });
    res.json(aiResult);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
