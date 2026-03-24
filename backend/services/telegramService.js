const Logger = require('../utils/logger');
const db = require('../config/database');
const signalParser = require('./signalParser');

class TelegramService {
  constructor() {
    this.bot = null;
    this.isConnected = false;
    this.lastMessageTime = null;
    this.messageCount = 0;
    this.onSignalCallback = null;
    this.io = null;
  }

  /**
   * Telegram bot'u başlatır
   */
  async initialize(io = null) {
    this.io = io;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token || token === 'your-bot-token-from-botfather') {
      await Logger.warn('TelegramService', 'Telegram bot token ayarlanmamış - mock modda çalışacak');
      this.isConnected = false;
      return;
    }

    try {
      const TelegramBot = require('node-telegram-bot-api');
      this.bot = new TelegramBot(token, { polling: true });

      this.bot.on('message', async (msg) => {
        await this.handleMessage(msg);
      });

      this.bot.on('polling_error', async (error) => {
        await Logger.error('TelegramService', 'Polling hatası', error.message);
      });

      this.isConnected = true;
      await Logger.info('TelegramService', 'Telegram bot başarıyla bağlandı');
    } catch (error) {
      await Logger.error('TelegramService', 'Telegram bot başlatılamadı', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Gelen mesajı işler
   */
  async handleMessage(msg) {
    try {
      const rawText = msg.text || '';
      if (!rawText.trim()) return;

      this.lastMessageTime = new Date();
      this.messageCount++;

      // Ham mesajı kaydet
      const [msgResult] = await db.execute(
        `INSERT INTO telegram_messages (message_id, chat_id, sender, raw_text, received_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [msg.message_id, msg.chat.id, msg.from?.username || msg.from?.first_name || 'unknown', rawText]
      );

      const telegramMsgId = msgResult.insertId;

      // Mesajı parse et
      const parsed = await signalParser.parse(rawText, telegramMsgId);

      // Update telegram message parse status
      await db.execute(
        'UPDATE telegram_messages SET parsed = 1, parse_success = ? WHERE id = ?',
        [parsed && parsed.validity ? 1 : 0, telegramMsgId]
      );

      if (parsed && parsed.validity) {
        const signalId = await signalParser.saveSignal(parsed, telegramMsgId);

        // Callback ile strateji motoruna bildir
        if (this.onSignalCallback) {
          this.onSignalCallback({ ...parsed, signalId, telegramMsgId });
        }

        // WebSocket ile frontend'e bildir
        if (this.io) {
          this.io.emit('newSignal', {
            signalId,
            symbol: parsed.symbol,
            direction: parsed.direction,
            entryMin: parsed.entryMin,
            entryMax: parsed.entryMax,
            stopLoss: parsed.stopLoss,
            takeProfits: parsed.takeProfits,
            timestamp: new Date()
          });
        }

        await Logger.info('TelegramService', `Yeni sinyal işlendi: ${parsed.symbol} ${parsed.direction}`);
      } else {
        // WebSocket ile parse edilememiş mesajı bildir
        if (this.io) {
          this.io.emit('telegramMessage', {
            raw: rawText.substring(0, 500),
            parsed: false,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      await Logger.error('TelegramService', 'Mesaj işleme hatası', error.message);
    }
  }

  /**
   * Sinyal geldiğinde çağrılacak callback'i ayarlar
   */
  onSignal(callback) {
    this.onSignalCallback = callback;
  }

  /**
   * Servis durumunu döndürür
   */
  getStatus() {
    return {
      connected: this.isConnected,
      lastMessage: this.lastMessageTime,
      messageCount: this.messageCount,
      botActive: !!this.bot
    };
  }

  /**
   * Mock sinyal gönder (test amaçlı)
   */
  async sendMockSignal(text) {
    const mockMsg = {
      message_id: Date.now(),
      chat: { id: -1 },
      from: { username: 'mock_test' },
      text
    };
    await this.handleMessage(mockMsg);
  }

  /**
   * Bot'u durdurur
   */
  async stop() {
    if (this.bot) {
      await this.bot.stopPolling();
      this.isConnected = false;
      await Logger.info('TelegramService', 'Telegram bot durduruldu');
    }
  }
}

module.exports = new TelegramService();
