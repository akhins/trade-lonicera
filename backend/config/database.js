const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Validate required environment variables
function validateEnvironment() {
  const required = ['MONGODB_URI'];
  const missing = required.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Check .env file.`);
  }
}

validateEnvironment();

// MongoDB Connection
const connectDB = async () => {
  try {
    console.log('[DB] Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('[DB] ✅ Connected to MongoDB successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('[DB] ❌ MongoDB connection error:', error.message);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] ⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('[DB] MongoDB error:', error.message);
});

module.exports = { connectDB, mongoose };
