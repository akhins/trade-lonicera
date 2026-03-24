const Logger = require('../utils/logger');
const db = require('../config/database');

/**
 * Telegram sinyal mesajı parser sistemi
 * Esnek ve genişletilebilir yapıda
 */
class SignalParser {
  constructor() {
    // Parser formatları - yeni formatlar buraya eklenir
    this.parsers = [
      { name: 'format_standard', parser: this.parseStandardFormat.bind(this) },
      { name: 'format_compact', parser: this.parseCompactFormat.bind(this) },
      { name: 'format_detailed', parser: this.parseDetailedFormat.bind(this) },
      { name: 'format_simple', parser: this.parseSimpleFormat.bind(this) }
    ];
  }

  /**
   * Ana parse metodu - tüm formatları dener
   */
  async parse(rawText, telegramMessageId = null) {
    let result = null;

    for (const { name, parser } of this.parsers) {
      try {
        result = parser(rawText);
        if (result && result.symbol && result.direction) {
          result.parserUsed = name;
          break;
        }
      } catch (err) {
        // İzin verilen hata - sonraki parser'ı dener
      }
    }

    if (!result) {
      await Logger.warn('SignalParser', 'Mesaj parse edilemedi', { rawText: rawText.substring(0, 200) });
      return null;
    }

    // Doğrulama
    const validation = this.validate(result);
    if (!validation.valid) {
      await Logger.warn('SignalParser', `Sinyal geçersiz: ${validation.reason}`, result);
      result.validity = false;
      result.validationNotes = validation.reason;
    } else {
      result.validity = true;
    }

    return result;
  }

  /**
   * Format 1: Standart format
   * 🔵 LONG BTCUSDT
   * Entry: 42000 - 42500
   * SL: 41000
   * TP1: 43000
   * TP2: 44000
   * TP3: 45000
   */
  parseStandardFormat(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Yön ve sembol
    const directionMatch = text.match(/(?:🔵|🟢|🔴|🟡|⬆️|⬇️)?\s*(LONG|SHORT)\s+([A-Z0-9]{2,20}(?:USDT)?)/i);
    if (!directionMatch) return null;

    const direction = directionMatch[1].toUpperCase();
    let symbol = directionMatch[2].toUpperCase();
    if (!symbol.endsWith('USDT')) symbol += 'USDT';

    // Entry zone
    const entryMatch = text.match(/entry\s*[:\-]?\s*([\d.]+)\s*[-–]\s*([\d.]+)/i) 
      || text.match(/entry\s*[:\-]?\s*([\d.]+)/i);
    
    let entryMin, entryMax;
    if (entryMatch) {
      entryMin = parseFloat(entryMatch[1]);
      entryMax = entryMatch[2] ? parseFloat(entryMatch[2]) : entryMin;
    }

    // Stop Loss
    const slMatch = text.match(/(?:sl|stop\s*loss|stop)\s*[:\-]?\s*([\d.]+)/i);
    const stopLoss = slMatch ? parseFloat(slMatch[1]) : null;

    // Take Profits
    const tpValues = [];
    const tpMatches = text.matchAll(/(?:tp|take\s*profit)\s*(\d)?\s*[:\-]?\s*([\d.]+)/gi);
    for (const match of tpMatches) {
      tpValues.push(parseFloat(match[2]));
    }

    // Leverage
    const levMatch = text.match(/(?:lev|leverage|kaldıraç)\s*[:\-]?\s*(\d+)\s*x?/i);
    const leverage = levMatch ? parseInt(levMatch[1]) : null;

    return {
      symbol,
      direction,
      entryMin: entryMin || null,
      entryMax: entryMax || null,
      stopLoss,
      takeProfits: tpValues,
      leverage
    };
  }

  /**
   * Format 2: Kompakt format
   * BTCUSDT LONG 42000 SL:41000 TP:43000/44000/45000
   */
  parseCompactFormat(text) {
    const match = text.match(
      /([A-Z0-9]{2,20}(?:USDT)?)\s+(LONG|SHORT)\s+([\d.]+)\s+SL\s*[:\-]?\s*([\d.]+)\s+TP\s*[:\-]?\s*([\d./]+)/i
    );
    if (!match) return null;

    let symbol = match[1].toUpperCase();
    if (!symbol.endsWith('USDT')) symbol += 'USDT';

    const tpValues = match[5].split('/').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

    return {
      symbol,
      direction: match[2].toUpperCase(),
      entryMin: parseFloat(match[3]),
      entryMax: parseFloat(match[3]),
      stopLoss: parseFloat(match[4]),
      takeProfits: tpValues,
      leverage: null
    };
  }

  /**
   * Format 3: Detaylı format (emoji-heavy)
   * 📊 Signal Alert
   * 🪙 Symbol: BTCUSDT
   * 📈 Direction: LONG
   * 💰 Entry: 42000-42500
   * 🛑 Stop Loss: 41000
   * 🎯 TP1: 43000
   * 🎯 TP2: 44000
   */
  parseDetailedFormat(text) {
    const symbolMatch = text.match(/(?:symbol|pair|parite|coin)\s*[:\-]?\s*([A-Z0-9]{2,20}(?:USDT)?)/i);
    const dirMatch = text.match(/(?:direction|yön|side|pozisyon)\s*[:\-]?\s*(LONG|SHORT|BUY|SELL)/i);
    
    if (!symbolMatch || !dirMatch) return null;

    let symbol = symbolMatch[1].toUpperCase();
    if (!symbol.endsWith('USDT')) symbol += 'USDT';

    let direction = dirMatch[1].toUpperCase();
    if (direction === 'BUY') direction = 'LONG';
    if (direction === 'SELL') direction = 'SHORT';

    const entryMatch = text.match(/entry\s*[:\-]?\s*([\d.]+)(?:\s*[-–]\s*([\d.]+))?/i);
    const slMatch = text.match(/(?:sl|stop\s*loss|stop)\s*[:\-]?\s*([\d.]+)/i);
    
    const tpValues = [];
    const tpMatches = text.matchAll(/(?:tp|target|hedef)\s*\d*\s*[:\-]?\s*([\d.]+)/gi);
    for (const match of tpMatches) {
      tpValues.push(parseFloat(match[1]));
    }

    const levMatch = text.match(/leverage\s*[:\-]?\s*(\d+)/i);

    return {
      symbol,
      direction,
      entryMin: entryMatch ? parseFloat(entryMatch[1]) : null,
      entryMax: entryMatch && entryMatch[2] ? parseFloat(entryMatch[2]) : (entryMatch ? parseFloat(entryMatch[1]) : null),
      stopLoss: slMatch ? parseFloat(slMatch[1]) : null,
      takeProfits: tpValues,
      leverage: levMatch ? parseInt(levMatch[1]) : null
    };
  }

  /**
   * Format 4: Basit format
   * BTCUSDT
   * LONG
   * 42000
   * SL 41000
   * TP 43000
   */
  parseSimpleFormat(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) return null;

    // İlk satır sembol olabilir
    const symbolMatch = lines[0].match(/([A-Z0-9]{2,20}(?:USDT)?)/i);
    if (!symbolMatch) return null;

    let symbol = symbolMatch[1].toUpperCase();
    if (!symbol.endsWith('USDT')) symbol += 'USDT';

    // Yön arama
    let direction = null;
    for (const line of lines) {
      if (/LONG/i.test(line)) { direction = 'LONG'; break; }
      if (/SHORT/i.test(line)) { direction = 'SHORT'; break; }
    }
    if (!direction) return null;

    // Sayısal değerleri çıkar
    const numbers = [];
    for (const line of lines) {
      const numMatch = line.match(/([\d.]+)/);
      if (numMatch && !/LONG|SHORT/i.test(line.replace(/[\d.]/g, ''))) {
        numbers.push({ value: parseFloat(numMatch[1]), line });
      }
    }

    const slMatch = text.match(/(?:sl|stop)\s*[:\-]?\s*([\d.]+)/i);
    const tpMatches = [...text.matchAll(/(?:tp|target)\s*\d*\s*[:\-]?\s*([\d.]+)/gi)];

    return {
      symbol,
      direction,
      entryMin: numbers.length > 0 ? numbers[0].value : null,
      entryMax: numbers.length > 0 ? numbers[0].value : null,
      stopLoss: slMatch ? parseFloat(slMatch[1]) : null,
      takeProfits: tpMatches.map(m => parseFloat(m[1])),
      leverage: null
    };
  }

  /**
   * Parse sonucunu doğrular
   */
  validate(signal) {
    if (!signal.symbol) return { valid: false, reason: 'Sembol bulunamadı' };
    if (!signal.direction) return { valid: false, reason: 'Yön (LONG/SHORT) bulunamadı' };
    if (!signal.stopLoss) return { valid: false, reason: 'Stop loss bulunamadı' };
    if (!signal.entryMin) return { valid: false, reason: 'Entry fiyatı bulunamadı' };
    
    // Yön-fiyat tutarlılık kontrolü
    if (signal.direction === 'LONG' && signal.stopLoss >= signal.entryMin) {
      return { valid: false, reason: 'LONG pozisyonda SL, entry\'den yüksek olamaz' };
    }
    if (signal.direction === 'SHORT' && signal.stopLoss <= signal.entryMin) {
      return { valid: false, reason: 'SHORT pozisyonda SL, entry\'den düşük olamaz' };
    }

    return { valid: true };
  }

  /**
   * Parse sonucunu veritabanına kaydeder
   */
  async saveSignal(parsedSignal, telegramMessageId = null) {
    try {
      const [result] = await db.execute(
        `INSERT INTO signals (telegram_message_id, symbol, direction, entry_min, entry_max, 
         stop_loss, take_profit_1, take_profit_2, take_profit_3, take_profit_4, 
         leverage, validity, validation_notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          telegramMessageId,
          parsedSignal.symbol,
          parsedSignal.direction,
          parsedSignal.entryMin,
          parsedSignal.entryMax,
          parsedSignal.stopLoss,
          parsedSignal.takeProfits[0] || null,
          parsedSignal.takeProfits[1] || null,
          parsedSignal.takeProfits[2] || null,
          parsedSignal.takeProfits[3] || null,
          parsedSignal.leverage,
          parsedSignal.validity ? 1 : 0,
          parsedSignal.validationNotes || null,
          parsedSignal.validity ? 'PENDING' : 'INVALID'
        ]
      );

      await Logger.info('SignalParser', `Sinyal kaydedildi: ${parsedSignal.symbol} ${parsedSignal.direction}`, { signalId: result.insertId });
      return result.insertId;
    } catch (error) {
      await Logger.error('SignalParser', 'Sinyal kaydedilemedi', error.message);
      throw error;
    }
  }
}

module.exports = new SignalParser();
