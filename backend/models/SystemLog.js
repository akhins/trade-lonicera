const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  service: {
    type: String,
    default: 'system'
  },
  metadata: mongoose.Schema.Types.Mixed,
  created_at: {
    type: Date,
    default: Date.now,
    index: { expires: 604800 } // Auto-delete after 7 days
  }
});

// Index for faster queries
systemLogSchema.index({ level: 1, created_at: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
