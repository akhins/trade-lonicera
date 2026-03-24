const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    const [settings] = await db.execute('SELECT * FROM settings ORDER BY setting_key');
    const config = {};
    settings.forEach(s => {
      config[s.setting_key] = {
        value: s.setting_value,
        description: s.description,
        updatedAt: s.updated_at
      };
    });
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings
router.put('/', async (req, res, next) => {
  try {
    const updates = req.body;
    
    for (const [key, value] of Object.entries(updates)) {
      await db.execute(
        `INSERT INTO settings (setting_key, setting_value, updated_at) 
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
        [key, String(value), String(value)]
      );
    }

    res.json({ success: true, message: 'Ayarlar güncellendi' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/reset-balance
router.put('/reset-balance', async (req, res, next) => {
  try {
    const { balance = 10000 } = req.body;

    await db.execute(
      `UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'paper_balance'`,
      [String(balance)]
    );

    await db.execute(
      'INSERT INTO balance_history (balance, change_amount, change_reason) VALUES (?, 0, ?)',
      [balance, 'Bakiye sıfırlandı']
    );

    res.json({ success: true, balance });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
