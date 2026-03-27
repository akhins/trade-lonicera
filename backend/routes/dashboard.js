const express = require('express');
const router = express.Router();
const Logger = require('../utils/logger');
const binanceService = require('../services/binanceService');
const Trade = require('../models/Trade');
const Signal = require('../models/Signal');

const INITIAL_BALANCE = 10000;
const RECENT_LIMIT = 10;

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await Logger.info('Dashboard', 'Fetching dashboard stats...');
    
    const openTrades = await Trade.countDocuments({ user_id: userId, status: 'open' });
    const closedTrades = await Trade.countDocuments({ user_id: userId, status: 'closed' });
    const wins = await Trade.countDocuments({ user_id: userId, status: 'closed', pnl: { $gt: 0 } });
    const winRate = closedTrades > 0 ? (wins / closedTrades * 100) : 0;

    const pnlData = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed' } },
      { $group: { _id: null, total: { $sum: '$pnl' } } }
    ]);
    const totalPnl = pnlData[0]?.total || 0;
    const balance = INITIAL_BALANCE + totalPnl;
    const totalPnlPercent = (totalPnl / INITIAL_BALANCE) * 100;

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyPnlData = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed', closed_at: { $gte: yesterday } } },
      { $group: { _id: null, total: { $sum: '$pnl' } } }
    ]);
    const dailyPnl = dailyPnlData[0]?.total || 0;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyPnlData = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed', closed_at: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$pnl' } } }
    ]);
    const weeklyPnl = weeklyPnlData[0]?.total || 0;

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyPnlData = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed', closed_at: { $gte: monthAgo } } },
      { $group: { _id: null, total: { $sum: '$pnl' } } }
    ]);
    const monthlyPnl = monthlyPnlData[0]?.total || 0;

    res.json({
      balance,
      initialBalance: INITIAL_BALANCE,
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      totalPnlPercent: parseFloat(totalPnlPercent.toFixed(2)),
      openTradeCount: openTrades,
      closedTradeCount: closedTrades,
      winRate: parseFloat(winRate.toFixed(2)),
      dailyPnl: parseFloat(dailyPnl.toFixed(2)),
      weeklyPnl: parseFloat(weeklyPnl.toFixed(2)),
      monthlyPnl: parseFloat(monthlyPnl.toFixed(2)),
      avgRiskReward: 2,
      totalSignals: openTrades + closedTrades
    });

    console.log('✅ Stats fetched successfully');
  } catch (error) {
    await Logger.error('Dashboard', 'Stats fetch error', error.message);
    next(error);
  }
});

// GET /api/dashboard/recent-trades
router.get('/recent-trades', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const trades = await Trade.find({ user_id: userId })
      .sort({ opened_at: -1 })
      .limit(RECENT_LIMIT)
      .lean();
    
    const enriched = trades.map(trade => {
      if (trade.status === 'open') {
        const currentPrice = binanceService.getPrice(trade.symbol);
        if (currentPrice) {
          const valDiff = trade.side === 'LONG' 
            ? (currentPrice - trade.entry_price) 
            : (trade.entry_price - currentPrice);
          trade.pnl = valDiff * trade.quantity;
          trade.pnl_percent = ((valDiff / trade.entry_price) * 100).toFixed(2);
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
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const signals = await Signal.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(10)
      .lean();
    
    res.json(signals);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/top-pairs
router.get('/top-pairs', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const topPairs = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed' } },
      { $group: {
          _id: '$symbol',
          trade_count: { $sum: 1 },
          total_pnl: { $sum: '$pnl' },
          avg_pnl_percent: { $avg: '$pnl_percentage' }
        }
      },
      { $sort: { total_pnl: -1 } },
      { $limit: 5 }
    ]);

    const worstPairs = await Trade.aggregate([
      { $match: { user_id: userId, status: 'closed' } },
      { $group: {
          _id: '$symbol',
          trade_count: { $sum: 1 },
          total_pnl: { $sum: '$pnl' },
          avg_pnl_percent: { $avg: '$pnl_percentage' }
        }
      },
      { $sort: { total_pnl: 1 } },
      { $limit: 5 }
    ]);

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
    
    const openTradesCount = await Trade.countDocuments({ status: 'open' });

    res.json({
      database: { connected: true },
      binance: binanceService.getStatus(),
      tradingSystem: {
        isRunning: true,
        openTrades: openTradesCount,
        unrealizedPnl: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/pnl-chart
router.get('/pnl-chart', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const trades = await Trade.find({ user_id: userId, status: 'closed' })
      .sort({ closed_at: 1 })
      .lean();
    
    let currentBalance = INITIAL_BALANCE;
    const history = trades.map(t => {
      currentBalance += t.pnl;
      return {
        recorded_at: t.closed_at,
        balance: currentBalance,
        change_amount: t.pnl
      };
    });

    console.log('✅ PnL Chart history fetched');
    res.json(history);
  } catch (error) {
    await Logger.error('Dashboard', 'PnL Chart error', error.message);
    next(error);
  }
});

module.exports = router;
