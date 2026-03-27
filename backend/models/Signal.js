const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  direction: {
    type: String,
    enum: ['LONG', 'SHORT'],
    required: true
  },
  entry_price: {
    type: Number,
    required: true
  },
  take_profit: {
    type: Number,
    required: true
  },
  stop_loss: {
    type: Number,
    required: true
  },
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  source: {
    type: String,
    enum: ['stochastic_macd', 'fibonacci_pivot', 'manual'],
    default: 'stochastic_macd'
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'cancelled'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
signalSchema.index({ user_id: 1, created_at: -1 });
signalSchema.index({ symbol: 1, status: 1 });

module.exports = mongoose.model('Signal', signalSchema);
