const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const User = require('../models/User');

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await Settings.findOne({ user_id: userId }).lean();
    
    if (!settings) {
      // Create default settings if doesn't exist
      settings = new Settings({ user_id: userId });
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings
router.put('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const settings = await Settings.findOneAndUpdate(
      { user_id: userId },
      req.body,
      { new: true, upsert: true }
    );

    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/user-profile
router.get('/user-profile', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId).select('-password_hash').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/user-profile
router.put('/user-profile', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { email },
      { new: true }
    ).select('-password_hash');

    res.json(user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
