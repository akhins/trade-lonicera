const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Validate required environment variables
function validateEnvironment() {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'];
  const missing = required.filter(v => {
    if (v === 'DB_PASSWORD') return false; // DB_PASSWORD can be empty
    return !process.env[v];
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Check .env file.`);
  }
}

validateEnvironment();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

// Test connection with retry and better error handling
let connectionAttempts = 0;
const testConnection = async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('✅ Database connected successfully');
    conn.release();
  } catch (err) {
    connectionAttempts++;
    console.error(`❌ Database connection failed (attempt ${connectionAttempts}):`, err.message);
    if (connectionAttempts < 3) {
      setTimeout(testConnection, 2000);
    } else {
      console.error('❌ Max connection attempts reached. Please check DB configuration.');
      process.exit(1);
    }
  }
};

// Test connection on startup
testConnection();

module.exports = pool;
