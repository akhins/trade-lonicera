const db = require('../config/database');

class Logger {
  static async log(level, module, message, details = null) {
    // Try to write to database, but don't fail if DB is down
    try {
      await db.execute(
        'INSERT INTO system_logs (level, module, message, details) VALUES (?, ?, ?, ?)',
        [level, module, message, details ? JSON.stringify(details) : null]
      );
    } catch (err) {
      // Fallback to console only - don't propagate DB write errors
      // This ensures logging doesn't crash the app if DB is unavailable
    }
    
    // Always output to console as fallback
    const timestamp = new Date().toISOString();
    const emoji = { DEBUG: '🔍', INFO: 'ℹ️', WARN: '⚠️', ERROR: '❌', FATAL: '💀' };
    console.log(`${emoji[level] || '📝'} [${timestamp}] [${module}] ${message}`);
    if (details) {
      if (typeof details === 'string') {
        console.log('  Details:', details);
      } else {
        console.log('  Details:', JSON.stringify(details, null, 2));
      }
    }
  }

  static debug(module, message, details) { return this.log('DEBUG', module, message, details); }
  static info(module, message, details) { return this.log('INFO', module, message, details); }
  static warn(module, message, details) { return this.log('WARN', module, message, details); }
  static error(module, message, details) { return this.log('ERROR', module, message, details); }
  static fatal(module, message, details) { return this.log('FATAL', module, message, details); }
}

module.exports = Logger;
