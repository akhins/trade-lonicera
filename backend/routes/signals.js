const express = require('express');
const router = express.Router();
const Signal = require('../models/Signal');

// GET /api/signals
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status, symbol, limit = 50, offset = 0 } = req.query;
    
    const query = { user_id: userId };
    if (status) query.status = status;
    if (symbol) query.symbol = symbol;

    const signals = await Signal.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await Signal.countDocuments(query);

    res.json({ signals, total });
  } catch (error) {
    next(error);
  }
});

// GET /api/signals/:id
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const signal = await Signal.findOne({ _id: req.params.id, user_id: userId }).lean();
    if (!signal) return res.status(404).json({ error: 'Signal not found' });
    
    res.json(signal);
  } catch (error) {
    next(error);
  }
});

// POST /api/signals - Create signal
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { symbol, direction, entry_price, take_profit, stop_loss, confidence, source } = req.body;

    if (!symbol || !direction || !entry_price || !take_profit || !stop_loss) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const signal = new Signal({
      user_id: userId,
      symbol: symbol.toUpperCase(),
      direction: direction.toUpperCase(),
      entry_price,
      take_profit,
      stop_loss,
      confidence: confidence || 0,
      source: source || 'manual'
    });

    await signal.save();
    res.status(201).json(signal);
  } catch (error) {
    next(error);
  }
});

// PUT /api/signals/:id - Update signal
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const signal = await Signal.findOneAndUpdate(
      { _id: req.params.id, user_id: userId },
      req.body,
      { new: true }
    );

    if (!signal) return res.status(404).json({ error: 'Signal not found' });
    res.json(signal);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/signals/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const signal = await Signal.findOneAndDelete({ _id: req.params.id, user_id: userId });
    if (!signal) return res.status(404).json({ error: 'Signal not found' });
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
