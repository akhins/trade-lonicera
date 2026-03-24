const db = require('../config/database');

class Logger {
  static async log(level, module, message, details = null) {
    try {
      await db.execute(
        'INSERT INTO system_logs (level, module, message, details) VALUES (?, ?, ?, ?)',
        [level, module, message, details ? JSON.stringify(details) : null]
      );
    } catch (err) {
      console.error(`[LOG-ERROR] Failed to write log: ${err.message}`);
    }
    
    const timestamp = new Date().toISOString();
    const emoji = { DEBUG: '🔍', INFO: 'ℹ️', WARN: '⚠️', ERROR: '❌', FATAL: '💀' };
    console.log(`${emoji[level] || '📝'} [${timestamp}] [${module}] ${message}`);
    if (details) console.log('  Details:', typeof details === 'string' ? details : JSON.stringify(details));
  }

  static debug(module, message, details) { return this.log('DEBUG', module, message, details); }
  static info(module, message, details) { return this.log('INFO', module, message, details); }
  static warn(module, message, details) { return this.log('WARN', module, message, details); }
  static error(module, message, details) { return this.log('ERROR', module, message, details); }
  static fatal(module, message, details) { return this.log('FATAL', module, message, details); }
}

module.exports = Logger;
