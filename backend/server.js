require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass local SSL/antivirus certificate issues for Binance fetch

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const Logger = require('./utils/logger');

// Services
const binanceService = require('./services/binanceService');
const telegramService = require('./services/telegramService');
const strategyEngine = require('./services/strategyEngine');
const paperTradingEngine = require('./services/paperTradingEngine');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/system/logs') && !req.path.startsWith('/socket.io')) {
    console.log(`📡 ${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));
app.use('/api/signals', authMiddleware, require('./routes/signals'));
app.use('/api/trades', authMiddleware, require('./routes/trades'));
app.use('/api/analytics', authMiddleware, require('./routes/analytics'));
app.use('/api/settings', authMiddleware, require('./routes/settings'));
app.use('/api/system', authMiddleware, require('./routes/system'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Initialize services
async function initializeServices() {
  console.log('\n🚀 SametAbiTrade Paper Trading System Starting...\n');

  const p1 = (async () => {
    try {
      console.log('📊 Binance sembolleri yükleniyor...');
      await binanceService.fetchSymbols();
      await binanceService.fetchAllPrices();
      binanceService.startPriceUpdates(5000);
    } catch (err) {
      console.error('⚠️ Binance servisi başlatılamadı:', err.message);
      await Logger.warn('System', 'Binance servisi başlatılamadı (Fiyatlar çekilemeyecek)', err.message);
    }
  })();

  const p2 = (async () => {
    try {
      console.log('💰 Paper Trading Engine başlatılıyor...');
      await paperTradingEngine.initialize(io);

      console.log('🧠 Strateji motoru başlatılıyor...');
      await strategyEngine.initialize(io, paperTradingEngine);
    } catch (err) {
      console.error('⚠️ Paper Tra/Strategy motoru hatası:', err.message);
    }
  })();

  const p3 = (async () => {
    try {
      console.log('📱 Telegram servisi başlatılıyor...');
      await telegramService.initialize(io);
      telegramService.onSignal(async (signalData) => {
        await strategyEngine.addSignal(signalData);
      });
    } catch (err) {
      console.error('⚠️ Telegram servisi hatası:', err.message);
    }
  })();

  await Promise.all([p1, p2, p3]);

  console.log('\n✅ Servis başlatma serisi tamamlandı!\n');
  await Logger.info('System', 'Servis başlatma denemeleri tamamlandı');
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`\n🌐 Server çalışıyor: http://localhost:${PORT}`);
  console.log(`📡 WebSocket aktif`);
  console.log('');
  await initializeServices();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Sistem kapatılıyor...');
  binanceService.stopPriceUpdates();
  strategyEngine.stop();
  await telegramService.stop();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

module.exports = { app, server, io };
