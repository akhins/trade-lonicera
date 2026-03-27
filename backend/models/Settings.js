const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  telegram_enabled: {
    type: Boolean,
    default: false
  },
  telegram_chat_id: {
    type: String,
    default: null
  },
  max_trades: {
    type: Number,
    default: 10,
    min: 1,
    max: 50
  },
  risk_percent: {
    type: Number,
    default: 2,
    min: 0.1,
    max: 10
  },
  stochastic_enabled: {
    type: Boolean,
    default: true
  },
  fibonacci_enabled: {
    type: Boolean,
    default: true
  },
  leverage: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  scan_interval_minutes: {
    type: Number,
    default: 15,
    enum: [5, 15, 30, 60]
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update updated_at on save
settingsSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
