/**
 * Teknik Analiz İndikatör Hesaplamaları
 * EMA, Stochastic, MACD hesaplamaları
 */

class TechnicalIndicators {
  /**
   * Exponential Moving Average (EMA) hesaplar
   * @param {Array} prices - Fiyat dizisi (kapanış fiyatları)
   * @param {number} period - Periyot
   * @returns {Array} EMA değerleri
   */
  static calculateEMA(prices, period) {
    if (prices.length < period) return [];

    const multiplier = 2 / (period + 1);
    const ema = [];
    let sum = 0;

    // İlk EMA için basit ortalama
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);

    // Kalan EMA değerleri
    for (let i = period; i < prices.length; i++) {
      const value = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(value);
    }

    return ema;
  }

  /**
   * Stochastic Oscillator hesaplar
   * @param {Array} highs - Yüksek fiyatlar
   * @param {Array} lows - Düşük fiyatlar
   * @param {Array} closes - Kapanış fiyatları
   * @param {number} kLength - K periyodu (50)
   * @param {number} kSmoothing - K smoothing (21)
   * @param {number} dSmoothing - D smoothing (8)
   * @returns {Object} {k: Array, d: Array}
   */
  static calculateStochastic(highs, lows, closes, kLength = 50, kSmoothing = 21, dSmoothing = 8) {
    if (highs.length < kLength || lows.length < kLength || closes.length < kLength) {
      return { k: [], d: [] };
    }

    const kValues = [];
    const dValues = [];

    // %K hesapla
    for (let i = kLength - 1; i < closes.length; i++) {
      const highMax = Math.max(...highs.slice(i - kLength + 1, i + 1));
      const lowMin = Math.min(...lows.slice(i - kLength + 1, i + 1));
      const k = ((closes[i] - lowMin) / (highMax - lowMin)) * 100;
      kValues.push(k);
    }

    // %K'yi smooth et (kSmoothing)
    const smoothedK = this.calculateEMA(kValues, kSmoothing);

    // %D hesapla (%K'nin EMA'sı)
    const d = this.calculateEMA(smoothedK, dSmoothing);

    return {
      k: smoothedK,
      d: d
    };
  }

  /**
   * MACD hesaplar
   * @param {Array} prices - Fiyat dizisi
   * @param {number} fastLength - Fast EMA (25)
   * @param {number} slowLength - Slow EMA (50)
   * @param {number} signalLength - Signal EMA (9)
   * @returns {Object} {macd: Array, signal: Array, histogram: Array}
   */
  static calculateMACD(prices, fastLength = 25, slowLength = 50, signalLength = 9) {
    if (prices.length < slowLength) return { macd: [], signal: [], histogram: [] };

    const fastEMA = this.calculateEMA(prices, fastLength);
    const slowEMA = this.calculateEMA(prices, slowLength);

    // MACD Line = Fast EMA - Slow EMA
    const macd = [];
    const startIndex = slowLength - fastLength;
    for (let i = 0; i < fastEMA.length - startIndex; i++) {
      macd.push(fastEMA[i + startIndex] - slowEMA[i]);
    }

    // Signal Line = MACD'nin EMA'sı
    const signal = this.calculateEMA(macd, signalLength);

    // Histogram = MACD - Signal
    const histogram = [];
    const signalStartIndex = signalLength - 1;
    for (let i = 0; i < signal.length; i++) {
      histogram.push(macd[i + signalStartIndex] - signal[i]);
    }

    return {
      macd: macd.slice(signalStartIndex),
      signal,
      histogram
    };
  }

  /**
   * Trend filtresi için EMA karşılaştırması
   * @param {Array} prices - Fiyat dizisi
   * @param {number} ema9Period - EMA 9 periyodu
   * @param {number} ema21Period - EMA 21 periyodu
   * @returns {string} 'UP' | 'DOWN' | 'NEUTRAL'
   */
  static getTrendDirection(prices, ema9Period = 9, ema21Period = 21) {
    if (prices.length < ema21Period) return 'NEUTRAL';

    const ema9 = this.calculateEMA(prices, ema9Period);
    const ema21 = this.calculateEMA(prices, ema21Period);

    const latestPrice = prices[prices.length - 1];
    const latestEMA9 = ema9[ema9.length - 1];
    const latestEMA21 = ema21[ema21.length - 1];

    if (latestPrice > latestEMA9 && latestPrice > latestEMA21) {
      return 'UP';
    } else if (latestPrice < latestEMA9 && latestPrice < latestEMA21) {
      return 'DOWN';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Stochastic sinyal kontrolü
   * @param {Array} kValues - %K değerleri
   * @param {Array} dValues - %D değerleri
   * @param {string} direction - 'LONG' | 'SHORT'
   * @returns {boolean}
   */
  static checkStochasticSignal(kValues, dValues, direction) {
    if (kValues.length === 0 || dValues.length === 0) return false;

    const latestK = kValues[kValues.length - 1];
    const latestD = dValues[dValues.length - 1];
    const prevK = kValues[kValues.length - 2];
    const prevD = dValues[dValues.length - 2];

    if (direction === 'LONG') {
      // LONG için: %K ve %D 20'nin altında, crossover yukarı
      return latestK < 20 && latestD < 20 && prevK <= prevD && latestK > latestD;
    } else if (direction === 'SHORT') {
      // SHORT için: %K ve %D 80'in üstünde, crossover aşağı
      return latestK > 80 && latestD > 80 && prevK >= prevD && latestK < latestD;
    }

    return false;
  }

  /**
   * MACD sinyal kontrolü
   * @param {Array} macd - MACD değerleri
   * @param {Array} signal - Signal değerleri
   * @param {Array} histogram - Histogram değerleri
   * @param {string} direction - 'LONG' | 'SHORT'
   * @returns {boolean}
   */
  static checkMACDSignal(macd, signal, histogram, direction) {
    if (macd.length < 2 || signal.length < 2 || histogram.length < 2) return false;

    const latestMACD = macd[macd.length - 1];
    const latestSignal = signal[signal.length - 1];
    const latestHistogram = histogram[histogram.length - 1];
    const prevMACD = macd[macd.length - 2];
    const prevSignal = signal[signal.length - 2];
    const prevHistogram = histogram[histogram.length - 2];

    if (direction === 'LONG') {
      // LONG için: MACD signal'ı yukarı keser, histogram pozitif
      return prevMACD <= prevSignal && latestMACD > latestSignal && latestHistogram > 0;
    } else if (direction === 'SHORT') {
      // SHORT için: MACD signal'ı aşağı keser, histogram negatif
      return prevMACD >= prevSignal && latestMACD < latestSignal && latestHistogram < 0;
    }

    return false;
  }

  /**
   * Average True Range (ATR) hesaplar
   * Volatilite ölçümü için kullanılır
   * @param {Array} highs - Yüksek fiyatlar
   * @param {Array} lows - Düşük fiyatlar
   * @param {Array} closes - Kapanış fiyatları
   * @param {number} period - ATR periyodu (varsayılan: 14)
   * @returns {number} ATR değeri
   */
  static calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return null;
    }

    const trueRanges = [];

    // True Range hesapla
    for (let i = 1; i < closes.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }

    // İlk ATR = basit ortalama
    let atr = 0;
    for (let i = 0; i < period; i++) {
      atr += trueRanges[i];
    }
    atr = atr / period;

    // Kalan ATR değerleri = EMA stilinde smoothed
    for (let i = period; i < trueRanges.length; i++) {
      atr = (trueRanges[i] * 1 + atr * (period - 1)) / period;
    }

    return atr;
  }

  /**
   * Fibonacci Retracement Levels hesaplar
   * @param {Array} highs - Yüksek fiyatlar
   * @param {Array} lows - Düşük fiyatlar
   * @param {number} lookback - Kaç bar geriye bakacağı (varsayılan: 100)
   * @returns {Object} Fibonacci seviyeleri
   */
  static calculateFibonacciLevels(highs, lows, lookback = 100) {
    if (highs.length < lookback || lows.length < lookback) {
      return null;
    }

    const recentHighs = highs.slice(-lookback);
    const recentLows = lows.slice(-lookback);

    const highPrice = Math.max(...recentHighs);
    const lowPrice = Math.min(...recentLows);
    const difference = highPrice - lowPrice;

    // Fibonacci seviyeleri
    const levels = {
      level0: lowPrice,                          // 0% - Taban
      level236: lowPrice + difference * 0.236,   // 23.6%
      level382: lowPrice + difference * 0.382,   // 38.2%
      level500: lowPrice + difference * 0.500,   // 50%
      level618: lowPrice + difference * 0.618,   // 61.8% (Altın oran)
      level786: lowPrice + difference * 0.786,   // 78.6%
      level100: highPrice,                       // 100% - Zirve
      highPrice,
      lowPrice,
      difference
    };

    return levels;
  }

  /**
   * Pivot Points Standard hesaplar
   * Daily High, Low, Close'a dayalı
   * @param {number} high - Günlük yüksek
   * @param {number} low - Günlük düşük
   * @param {number} close - Günlük kapanış
   * @returns {Object} Pivot destek/direnç seviyeleri
   */
  static calculatePivotPoints(high, low, close) {
    const pivot = (high + low + close) / 3;

    const levels = {
      r3: high + 2 * (pivot - low),                    // Resistance 3
      r2: pivot + (high - low),                        // Resistance 2
      r1: 2 * pivot - low,                             // Resistance 1
      pivot: pivot,                                     // Pivot Point (orta)
      s1: 2 * pivot - high,                            // Support 1
      s2: pivot - (high - low),                        // Support 2
      s3: low - 2 * (high - pivot),                    // Support 3
      high,
      low,
      close
    };

    return levels;
  }

  /**
   * Fibonacci Support/Resistance Kırılma Kontrolü
   * @param {number} price - Mevcut fiyat
   * @param {Array} prices - Fiyat serileri
   * @param {string} direction - 'LONG' | 'SHORT'
   * @param {number} lookback - Fibonacci lookback (varsayılan: 100)
   * @returns {Object} {isBreakout: boolean, level: string, distance: number}
   */
  static checkFibonacciBreakout(price, prices, highs, lows, direction, lookback = 100) {
    const fib = this.calculateFibonacciLevels(highs, lows, lookback);
    if (!fib) return { isBreakout: false, level: null };

    const tolerance = fib.difference * 0.002; // %0.2 tolerans

    if (direction === 'LONG') {
      // LONG: Fib seviyeleri destek olarak, kırılırsa sinyal
      if (Math.abs(price - fib.level618) < tolerance) {
        return { isBreakout: true, level: '61.8%', distance: Math.abs(price - fib.level618) };
      }
      if (Math.abs(price - fib.level500) < tolerance) {
        return { isBreakout: true, level: '50%', distance: Math.abs(price - fib.level500) };
      }
    } else if (direction === 'SHORT') {
      // SHORT: Fib seviyeleri direnç olarak, kırılırsa sinyal
      if (Math.abs(price - fib.level382) < tolerance) {
        return { isBreakout: true, level: '38.2%', distance: Math.abs(price - fib.level382) };
      }
      if (Math.abs(price - fib.level618) < tolerance) {
        return { isBreakout: true, level: '61.8%', distance: Math.abs(price - fib.level618) };
      }
    }

    return { isBreakout: false, level: null, distance: 0 };
  }

  /**
   * Pivot Points Kırılma Kontrolü
   * @param {number} price - Mevcut fiyat
   * @param {number} high - Günlük high
   * @param {number} low - Günlük low
   * @param {number} close - Günlük close
   * @param {string} direction - 'LONG' | 'SHORT'
   * @returns {Object} {isBreakout: boolean, level: string, distance: number}
   */
  static checkPivotBreakout(price, high, low, close, direction) {
    const pivot = this.calculatePivotPoints(high, low, close);
    const tolerance = (high - low) * 0.002; // %0.2 tolerans

    if (direction === 'LONG') {
      // LONG: Direnç seviyeleri kırca sinyal
      if (Math.abs(price - pivot.r1) < tolerance) {
        return { isBreakout: true, level: 'R1', distance: Math.abs(price - pivot.r1) };
      }
      if (Math.abs(price - pivot.r2) < tolerance) {
        return { isBreakout: true, level: 'R2', distance: Math.abs(price - pivot.r2) };
      }
    } else if (direction === 'SHORT') {
      // SHORT: Destek seviyeleri kırca sinyal
      if (Math.abs(price - pivot.s1) < tolerance) {
        return { isBreakout: true, level: 'S1', distance: Math.abs(price - pivot.s1) };
      }
      if (Math.abs(price - pivot.s2) < tolerance) {
        return { isBreakout: true, level: 'S2', distance: Math.abs(price - pivot.s2) };
      }
    }

    return { isBreakout: false, level: null, distance: 0 };
  }
}

module.exports = TechnicalIndicators;