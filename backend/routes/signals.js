const express = require('express');
const router = express.Router();
const db = require('../config/database');
const signalParser = require('../services/signalParser');
const telegramService = require('../services/telegramService');

// GET /api/signals - Tüm sinyaller
router.get('/', async (req, res, next) => {
  try {
    const { status, symbol, limit = 50, offset = 0 } = req.query;
    
    let query = `SELECT s.*, tm.raw_text 
                 FROM signals s 
                 LEFT JOIN telegram_messages tm ON s.telegram_message_id = tm.id`;
    const params = [];
    const conditions = [];

    if (status) { conditions.push('s.status = ?'); params.push(status); }
    if (symbol) { conditions.push('s.symbol = ?'); params.push(symbol); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [signals] = await db.execute(query, params);
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM signals');

    res.json({ signals, total: countResult[0].total });
  } catch (error) {
    next(error);
  }
});

// GET /api/signals/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [signals] = await db.execute(
      `SELECT s.*, tm.raw_text, tm.sender, tm.received_at as message_received
       FROM signals s 
       LEFT JOIN telegram_messages tm ON s.telegram_message_id = tm.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (signals.length === 0) return res.status(404).json({ error: 'Sinyal bulunamadı' });
    res.json(signals[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/signals/test - Manuel sinyal test
router.post('/test', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Sinyal metni gerekli' });

    const parsed = await signalParser.parse(text);

    res.json({
      raw: text,
      parsed,
      isValid: parsed ? parsed.validity : false,
      parserUsed: parsed ? parsed.parserUsed : null
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/signals/test-and-save - Test et ve kaydet
router.post('/test-and-save', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Sinyal metni gerekli' });

    // Mock mesaj olarak işle
    await telegramService.sendMockSignal(text);

    res.json({ success: true, message: 'Sinyal test edildi ve işleme alındı' });
  } catch (error) {
    next(error);
  }
});

// GET /api/signals/telegram/messages - Ham Telegram mesajları
router.get('/telegram/messages', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const [messages] = await db.execute(
      'SELECT * FROM telegram_messages ORDER BY received_at DESC LIMIT ?',
      [parseInt(limit)]
    );
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
