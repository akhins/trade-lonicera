const mongoose = require('mongoose');

const balanceHistorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    required: true,
    default: 10000 // Paper trading starting balance
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
balanceHistorySchema.index({ user_id: 1, timestamp: -1 });

module.exports = mongoose.model('BalanceHistory', balanceHistorySchema);
