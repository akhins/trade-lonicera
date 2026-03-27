const express = require('express');
const router = express.Router();
const db = require('../config/database');
const binanceService = require('../services/binanceService');
const telegramService = require('../services/telegramService');
const strategyEngine = require('../services/strategyEngine');
const paperTradingEngine = require('../services/paperTradingEngine');
const tradingSystem = require('../services/tradingSystem');

// GET /api/system/status
router.get('/status', async (req, res, next) => {
  try {
    let dbStatus = false;
    try {
      await db.execute('SELECT 1');
      dbStatus = true;
    } catch (e) {}

    res.json({
      telegram: telegramService.getStatus(),
      binance: binanceService.getStatus(),
      database: { connected: dbStatus },
      strategy: strategyEngine.getStatus(),
      paperTrading: paperTradingEngine.getStatus(),
      tradingSystem: tradingSystem.getStatus(),
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
    const { level, module, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM system_logs';
    const params = [];
    const conditions = [];

    if (level) { conditions.push('level = ?'); params.push(level); }
    if (module) { conditions.push('module = ?'); params.push(module); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await db.execute(query, params);
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM system_logs');

    res.json({ logs, total: countResult[0].total });
  } catch (error) {
    next(error);
  }
});

// GET /api/system/binance-symbols
router.get('/binance-symbols', async (req, res, next) => {
  try {
    const symbols = binanceService.symbols;
    res.json(symbols);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/system/logs - Logları temizle
router.delete('/logs', async (req, res, next) => {
  try {
    await db.execute('DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)');
    res.json({ success: true, message: '7 günden eski loglar temizlendi' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
