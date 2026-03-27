const express = require('express');
const router = express.Router();
const SystemLog = require('../models/SystemLog');
const binanceService = require('../services/binanceService');
const telegramService = require('../services/telegramService');
const strategyEngine = require('../services/strategyEngine');
const paperTradingEngine = require('../services/paperTradingEngine');
const tradingSystem = require('../services/tradingSystem');

// GET /api/system/status
router.get('/status', async (req, res, next) => {
  try {
    res.json({
      telegram: telegramService?.getStatus?.() || { connected: false },
      binance: binanceService?.getStatus?.() || { connected: false },
      database: { connected: true },
      strategy: strategyEngine?.getStatus?.() || { running: false },
      paperTrading: paperTradingEngine?.getStatus?.() || { running: false },
      tradingSystem: tradingSystem?.getStatus?.() || { running: false },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/system/logs
router.get('/logs', async (req, res, next) => {
  try {
    const { level, service, limit = 100, offset = 0 } = req.query;

    const query = {};
    if (level) query.level = level;
    if (service) query.service = service;

    const logs = await SystemLog.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await SystemLog.countDocuments(query);

    res.json({ logs, total });
  } catch (error) {
    next(error);
  }
});

// GET /api/system/binance-symbols
router.get('/binance-symbols', async (req, res, next) => {
  try {
    const symbols = binanceService?.symbols || [];
    res.json(symbols);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/system/logs - Clear old logs
router.delete('/logs', async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await SystemLog.deleteMany({ created_at: { $lt: sevenDaysAgo } });
    
    res.json({ success: true, message: 'Logs older than 7 days deleted' });
  } catch (error) {
    next(error);
  }
});

// GET /api/system/health
router.get('/health', async (req, res, next) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
