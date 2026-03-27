const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  signal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Signal',
    default: null
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  side: {
    type: String,
    enum: ['LONG', 'SHORT'],
    required: true
  },
  entry_price: {
    type: Number,
    required: true
  },
  exit_price: {
    type: Number,
    default: null
  },
  quantity: {
    type: Number,
    required: true
  },
  pnl: {
    type: Number,
    default: 0
  },
  pnl_percentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'cancelled'],
    default: 'open'
  },
  stop_loss: {
    type: Number,
    default: null
  },
  take_profit: {
    type: Number,
    default: null
  },
  opened_at: {
    type: Date,
    default: Date.now
  },
  closed_at: {
    type: Date,
    default: null
  }
});

// Index for faster queries
tradeSchema.index({ user_id: 1, opened_at: -1 });
tradeSchema.index({ symbol: 1, status: 1 });

module.exports = mongoose.model('Trade', tradeSchema);
