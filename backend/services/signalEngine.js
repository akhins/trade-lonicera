const Logger = require('../utils/logger');
const binanceService = require('./binanceService');
const TechnicalIndicators = require('../utils/indicators');

/**
 * Sinyal Motoru v2
 * ─────────────────────────────────────────────
 * Tüm USDT perpetual pariteleri tarar.
 * Trend Filtresi : 1h grafik, EMA9 & EMA21
 *   LONG  → kapanış > EMA9 VE kapanış > EMA21
 *   SHORT → kapanış < EMA9 VE kapanış < EMA21
 *
 * Sinyal : 15m grafik
 *   Stochastic (K=50, smooth_K=21, D=8)
 *   MACD       (fast=25, slow=50, signal=9)
 *
 * Risk/Reward : 1 : 3
 *   SL  → swing low/high (son 10 bar)
 *   TP  → entry ± (SL distance × 3)
 */
class SignalEngine {
  constructor() {
    this.isRunning = false;
    this.isScanning = false; // Prevent concurrent scans (race condition fix)
    this.scanInterval = null;
    this.signals = [];
    this.lastScanTime = null;
    // openTradesRef will be injected by tradingSystem so we can skip duplicates
    this.openTradesRef = null;
  }

  /**
   * Sinyal motorunu başlatır
   * @param {Map|null} openTradesRef - Mevcut açık trade map (symbol → trade)
   */
  async initialize(openTradesRef = null) {
    this.openTradesRef = openTradesRef;
    this.isRunning = true;
    await Logger.info('SignalEngine', 'Sinyal motoru ayarları yüklendi, tarama için hazır');
  }

  /**
   * Tüm USDT perpetual sembollerini tarar
   * @returns {Array} Üretilen sinyal listesi
   */
  async scanAllSymbols() {
    // Prevent concurrent scans (race condition fix)
    if (this.isScanning) {
      await Logger.warn('SignalEngine', 'Scan already in progress, skipping...');
      return [];
    }
    
    this.isScanning = true;
    try {
      this.lastScanTime = new Date();
      await Logger.info('SignalEngine', 'Sembol taraması başladı...');

      // Güncel sembol listesini çek
      let symbols = binanceService.symbols;
      if (!symbols || symbols.length === 0) {
        symbols = await binanceService.fetchSymbols();
      }

      const usdtSymbols = symbols.filter(s => s.quoteAsset === 'USDT');
      await Logger.info('SignalEngine', `${usdtSymbols.length} USDT paritesi taranıyor (Eş zamanlı)...`);

      const newSignals = [];
      const concurrency = 10; // 10 sembol eş zamanlı taranacak
      const chunks = [];
      
      for (let i = 0; i < usdtSymbols.length; i += concurrency) {
        chunks.push(usdtSymbols.slice(i, i + concurrency));
      }

      let processedCount = 0;
      for (const chunk of chunks) {
        if (!this.isRunning) break;

        const results = await Promise.all(chunk.map(async (symbolInfo) => {
          try {
            const signal = await this.analyzeSymbol(symbolInfo.symbol);
            if (signal) {
              await Logger.info('SignalEngine',
                `✅ Sinyal: ${signal.symbol} ${signal.direction} @ ${signal.entryPrice.toFixed(8)} | SL: ${signal.stopLoss.toFixed(8)} | TP: ${signal.takeProfit.toFixed(8)}`
              );
              return signal;
            }
          } catch (error) {
            await Logger.warn('SignalEngine', `${symbolInfo.symbol} analiz edilemedi: ${error.message}`);
          }
          return null;
        }));

        newSignals.push(...results.filter(s => s !== null));
        processedCount += chunk.length;

        // Her 50 sembolda bir ilerleme raporu
        if (processedCount % 50 === 0 || processedCount === usdtSymbols.length) {
          await Logger.info('SignalEngine', `İlerleme: ${processedCount}/${usdtSymbols.length} parite tarandı...`);
        }

        // Rate limit koruma ve event loop nefes alması için kısa bekleme
        await this._sleep(150);
      }

      this.signals = newSignals;
      await Logger.info('SignalEngine',
        `✅ Tarama tamamlandı. ${newSignals.length} sinyal bulundu. Zaman: ${this.lastScanTime.toLocaleTimeString('tr-TR')}`
      );
      
      // System status log'u yaz (System Logs sayfasında görünsün)
      if (newSignals.length > 0) {
        await Logger.info('System', `Market taraması: ${newSignals.length} sinyal`, {
          signalCount: newSignals.length,
          scanTime: this.lastScanTime.toISOString(),
          symbols: newSignals.map(s => s.symbol).join(', ')
        });
      }

      return newSignals;
    } catch (error) {
      await Logger.error('SignalEngine', 'Sembol tarama hatası', error.message);
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Tek bir sembolü analiz eder
   * @param {string} symbol
   * @returns {Object|null} Sinyal objesi veya null
   */
  async analyzeSymbol(symbol) {
    try {
      // ─── Aynı sembol için açık trade var mı? ─────────────────────────────
      if (this.openTradesRef && this.openTradesRef.has(symbol)) {
        return null; // Zaten açık trade var, geç
      }

      // ─── 1h mum verisi (trend filtresi) ──────────────────────────────────
      const hourlyKlines = await this._fetchKlinesSafe(symbol, '1h', 100);
      if (!hourlyKlines || hourlyKlines.length < 50) return null;

      // ─── Trend filtresi (1h EMA9 / EMA21) ────────────────────────────────
      const hourlyCloses = hourlyKlines.map(k => k.close);
      const trendData = this._getTrendData(hourlyCloses);

      if (trendData.direction === 'NEUTRAL') return null;

      // ─── 15m mum verisi (sinyal üretimi) ─────────────────────────────────
      const m15Klines = await this._fetchKlinesSafe(symbol, '15m', 200);
      if (!m15Klines || m15Klines.length < 100) return null;

      const m15Closes = m15Klines.map(k => k.close);
      const m15Highs  = m15Klines.map(k => k.high);
      const m15Lows   = m15Klines.map(k => k.low);

      // ─── Stochastic (50, 21, 8) ───────────────────────────────────────────
      const stoch = TechnicalIndicators.calculateStochastic(
        m15Highs, m15Lows, m15Closes, 50, 21, 8
      );
      if (!stoch.k.length || !stoch.d.length) return null;

      // ─── MACD (25, 50, 9) ────────────────────────────────────────────────
      const macd = TechnicalIndicators.calculateMACD(m15Closes, 25, 50, 9);
      if (!macd.macd.length || !macd.signal.length || !macd.histogram.length) return null;

      // ─── Sinyal Koşulları ─────────────────────────────────────────────────
      const direction = trendData.direction === 'UP' ? 'LONG' : 'SHORT';

      const stochOk = this._checkStochastic(stoch.k, stoch.d, direction);
      const macdOk  = this._checkMACD(macd.macd, macd.signal, macd.histogram, direction);

      // ─── Strateji 2: Fibonacci + Pivot Points ────────────────────────────
      let strategyUsed = 'Stochastic+MACD';
      let signalValid = stochOk && macdOk;

      if (!signalValid) {
        // Fibonacci + Pivot Points stratejisini dene
        const fibPivotResult = this._checkFibonacciPivotStrategy(
          m15Klines, m15Closes, m15Highs, m15Lows, direction
        );
        
        if (fibPivotResult.isValid) {
          signalValid = true;
          strategyUsed = 'Fibonacci+Pivot';
        } else {
          return null;
        }
      }

      if (!signalValid) return null;

      // ─── ATR (Average True Range) hesapla ──────────────────────────────────
      const atr = TechnicalIndicators.calculateATR(m15Highs, m15Lows, m15Closes, 14);
      if (!atr || atr <= 0) return null;

      // ─── Entry, SL, TP hesapla (ATR bazlı, 1:2 R/R) ───────────────────────
      const entryPrice = m15Closes[m15Closes.length - 1];
      let stopLoss, takeProfit;

      if (direction === 'LONG') {
        // LONG: SL = Entry - 1.5 * ATR
        stopLoss = entryPrice - atr * 1.5;
        // TP = Entry + 3 * ATR (1:2 RR için)  
        // Risk = 1.5 ATR, Reward = 3 ATR, Oran = 1:2
        takeProfit = entryPrice + atr * 3;
      } else {
        // SHORT: SL = Entry + 1.5 * ATR
        stopLoss = entryPrice + atr * 1.5;
        // TP = Entry - 3 * ATR (1:2 RR için)
        takeProfit = entryPrice - atr * 3;
      }

      // ─── Minimum risk mesafesi kontrolü ───────────────────────────────────
      const riskDist = Math.abs(entryPrice - stopLoss);
      const riskPct = (riskDist / entryPrice) * 100;
      if (riskPct < 0.1 || atr < 0.00001) return null; // Çok küçük trade geç

      // ─── İndikatör değerlerini topla ─────────────────────────────────────
      const lastK = stoch.k[stoch.k.length - 1];
      const lastD = stoch.d[stoch.d.length - 1];
      const prevK = stoch.k[stoch.k.length - 2];
      const prevD = stoch.d[stoch.d.length - 2];
      const lastMacd = macd.macd[macd.macd.length - 1];
      const lastSig  = macd.signal[macd.signal.length - 1];
      const lastHist = macd.histogram[macd.histogram.length - 1];

      const indicatorValues = {
        trend: {
          direction: trendData.direction,
          ema9: trendData.ema9,
          ema21: trendData.ema21,
          price: trendData.price
        },
        stochastic: {
          k: lastK,
          d: lastD,
          prevK,
          prevD
        },
        macd: {
          macd: lastMacd,
          signal: lastSig,
          histogram: lastHist
        }
      };

      const signalReason = [
        `Trend: 1h fiyat EMA9(${trendData.ema9.toFixed(4)}) ve EMA21(${trendData.ema21.toFixed(4)}) ${direction === 'LONG' ? 'üstünde' : 'altında'}`,
        `Strateji: ${strategyUsed}`,
        `Stochastic: K=${lastK.toFixed(2)} D=${lastD.toFixed(2)}`,
        `MACD: ${lastMacd.toFixed(6)} | Signal: ${lastSig.toFixed(6)} | Hist: ${lastHist.toFixed(6)}`
      ].join(' | ');

      return {
        symbol,
        direction,
        entryPrice,
        stopLoss: parseFloat(stopLoss.toFixed(8)),
        takeProfit: parseFloat(takeProfit.toFixed(8)),
        riskRewardRatio: 2, // 1:2 RR (ATR bazlı)
        riskPercent: parseFloat(riskPct.toFixed(4)),
        atrValue: parseFloat(atr.toFixed(8)),
        leverage: 5, // 5x kaldıraç
        signalReason,
        strategyUsed,
        indicatorValues: JSON.stringify(indicatorValues),
        timestamp: new Date()
      };

    } catch (error) {
      await Logger.error('SignalEngine', `${symbol} analiz hatası`, error.message);
      return null;
    }
  }

  // ─── Yardımcı: Trend Verisi ───────────────────────────────────────────────

  /**
   * 1h kapanış fiyatlarına göre trend yönünü belirler
   * @param {number[]} prices
   * @returns {{direction: string, ema9: number, ema21: number, price: number}}
   */
  _getTrendData(prices) {
    const ema9  = TechnicalIndicators.calculateEMA(prices, 9);
    const ema21 = TechnicalIndicators.calculateEMA(prices, 21);

    if (!ema9.length || !ema21.length) {
      return { direction: 'NEUTRAL', ema9: 0, ema21: 0, price: 0 };
    }

    const lastPrice = prices[prices.length - 1];
    const lastEMA9  = ema9[ema9.length - 1];
    const lastEMA21 = ema21[ema21.length - 1];

    let direction = 'NEUTRAL';
    if (lastPrice > lastEMA9 && lastPrice > lastEMA21) {
      direction = 'UP';
    } else if (lastPrice < lastEMA9 && lastPrice < lastEMA21) {
      direction = 'DOWN';
    }

    return { direction, ema9: lastEMA9, ema21: lastEMA21, price: lastPrice };
  }

  // ─── Yardımcı: Stochastic Sinyal Kontrolü ────────────────────────────────

  /**
   * Stochastic sinyal koşulunu kontrol eder
   *
   * LONG  → K < 50 ve K > D (oversold bölgesinden çıkış veya momentum dönüşü)
   * SHORT → K > 50 ve K < D (overbought bölgesinden çıkış veya momentum dönüşü)
   *
   * Not: Parametreler çok büyük (K=50, smooth=21) olduğundan 0-20/80-100 bantları
   * nadiren görülür. Bu yüzden 50 orta bantı referans alınır.
   */
  _checkStochastic(kValues, dValues, direction) {
    if (kValues.length < 2 || dValues.length < 2) return false;

    const lastK = kValues[kValues.length - 1];
    const lastD = dValues[dValues.length - 1];
    const prevK = kValues[kValues.length - 2];
    const prevD = dValues[dValues.length - 2];

    if (direction === 'LONG') {
      // K aşağıdan D'yi yukarı kesmiş (crossover yukarı)
      // ve K 50'nin altında (henüz overbought değil)
      return prevK <= prevD && lastK > lastD && lastK < 50;
    } else {
      // K yukarıdan D'yi aşağı kesmiş (crossover aşağı)
      // ve K 50'nin üstünde (henüz oversold değil)
      return prevK >= prevD && lastK < lastD && lastK > 50;
    }
  }

  // ─── Yardımcı: MACD Sinyal Kontrolü ──────────────────────────────────────

  /**
   * MACD sinyal koşulunu kontrol eder
   *
   * LONG  → MACD signal'ı yukarı kesmiş (crossover) VE histogram pozitif
   * SHORT → MACD signal'ı aşağı kesmiş (crossover) VE histogram negatif
   */
  _checkMACD(macdArr, signalArr, histogramArr, direction) {
    if (macdArr.length < 2 || signalArr.length < 2 || histogramArr.length < 2) return false;

    const lastMACD = macdArr[macdArr.length - 1];
    const lastSig  = signalArr[signalArr.length - 1];
    const lastHist = histogramArr[histogramArr.length - 1];
    const prevMACD = macdArr[macdArr.length - 2];
    const prevSig  = signalArr[signalArr.length - 2];

    if (direction === 'LONG') {
      // Crossover yukarı (son iki barda geçiş) VE histogram pozitif
      const crossoverUp = prevMACD <= prevSig && lastMACD > lastSig;
      // Ya da zaten MACD > Signal ve histogram artıyor (trend devam)
      const momentumUp  = lastMACD > lastSig && lastHist > 0;
      return crossoverUp || momentumUp;
    } else {
      // Crossover aşağı VE histogram negatif
      const crossoverDown  = prevMACD >= prevSig && lastMACD < lastSig;
      const momentumDown   = lastMACD < lastSig && lastHist < 0;
      return crossoverDown || momentumDown;
    }
  }

  // ─── Yardımcı: Güvenli kline çekimi (retry) ──────────────────────────────

  async _fetchKlinesSafe(symbol, interval, limit, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await binanceService.fetchKlines(symbol, interval, limit);
      } catch (err) {
        if (attempt < retries) {
          await this._sleep(500 * (attempt + 1));
        }
      }
    }
    return null;
  }

  // ─── Yardımcı: Promise sleep ──────────────────────────────────────────────

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── Strateji: Fibonacci + Pivot Points ──────────────────────────────────

  /**
   * Fibonacci + Pivot Points stratejisini kontrol eder
   * @param {Array} klines - Mum verileri (high, low, close içeren)
   * @param {Array} closes - Kapanış fiyatları
   * @param {Array} highs - Yüksek fiyatlar
   * @param {Array} lows - Düşük fiyatlar
   * @param {string} direction - 'LONG' | 'SHORT'
   * @returns {Object} {isValid: boolean, level: string, description: string}
   */
  _checkFibonacciPivotStrategy(klines, closes, highs, lows, direction) {
    try {
      if (!klines || klines.length < 100) {
        return { isValid: false, level: null };
      }

      const currentPrice = closes[closes.length - 1];
      
      // ─── Fibonacci Retracement Levels hesapla ──────────────────────────────
      const FibLevels = TechnicalIndicators.calculateFibonacciLevels(highs, lows, 100);
      if (!FibLevels) return { isValid: false, level: null };

      // ─── Daily kapat verisi (Pivot Points için) ─────────────────────────────
      // 15m klines'dan son 96 candleyi (1 gün = 96 * 15min) al
      const dailyHigh = Math.max(...klines.slice(-96).map(k => k.high));
      const dailyLow = Math.min(...klines.slice(-96).map(k => k.low));
      const dailyClose = closes[closes.length - 1];

      const PivotLevels = TechnicalIndicators.calculatePivotPoints(dailyHigh, dailyLow, dailyClose);

      // ─── Fibonacci Breakout Kontrolü ────────────────────────────────────────
      const fibBreakout = TechnicalIndicators.checkFibonacciBreakout(
        currentPrice, closes, highs, lows, direction, 100
      );

      // ─── Pivot Breakout Kontrolü ────────────────────────────────────────────
      const pivotBreakout = TechnicalIndicators.checkPivotBreakout(
        currentPrice, dailyHigh, dailyLow, dailyClose, direction
      );

      // ─── Sinyal Üretimi ─────────────────────────────────────────────────────
      // Fibonacci VEYA Pivot'tan biri breakout verdiyse sinyal üret
      const fibValid = fibBreakout.isBreakout;
      const pivotValid = pivotBreakout.isBreakout;

      if (!fibValid && !pivotValid) {
        return { isValid: false, level: null };
      }

      // Fibonacci ve Pivot seviyeleri arasında momentum kontrolü
      const momentum = this._checkFibonacciMomentum(closes, highs, lows, direction);
      if (!momentum) {
        return { isValid: false, level: null };
      }

      const description = [];
      if (fibValid) {
        description.push(`Fibonacci ${fibBreakout.level} breakout`);
      }
      if (pivotValid) {
        description.push(`Pivot ${pivotBreakout.level} breakout`);
      }

      return {
        isValid: true,
        level: fibValid ? `Fib-${fibBreakout.level}` : `Pivot-${pivotBreakout.level}`,
        description: description.join(' + '),
        fibLevels: FibLevels,
        pivotLevels: PivotLevels
      };

    } catch (error) {
      return { isValid: false, level: null };
    }
  }

  /**
   * Fibonacci seviyeleri arasında momentum kontrolü
   * (Sinyalı doğrulamak için ek bir filtre)
   * @param {Array} closes - Kapanış fiyatları
   * @param {Array} highs - Yüksek fiyatlar
   * @param {Array} lows - Düşük fiyatlar
   * @param {string} direction - 'LONG' | 'SHORT'
   * @returns {boolean}
   */
  _checkFibonacciMomentum(closes, highs, lows, direction) {
    if (closes.length < 20) return false;

    // Son 20 barda momentum kontrol
    const recentCloses = closes.slice(-20);
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);

    if (direction === 'LONG') {
      // Uptrend: kapanış fiyatları yükseliş eğiliminde
      const avgClose = recentCloses.reduce((a, b) => a + b) / recentCloses.length;
      const currentClose = recentCloses[recentCloses.length - 1];
      
      // Son 5 barda yukarı momentum
      const last5Closes = recentCloses.slice(-5);
      const isUpMomentum = last5Closes[4] > last5Closes[0];
      
      return isUpMomentum && currentClose > avgClose;
    } else {
      // Downtrend: kapanış fiyatları düşüş eğiliminde
      const avgClose = recentCloses.reduce((a, b) => a + b) / recentCloses.length;
      const currentClose = recentCloses[recentCloses.length - 1];
      
      // Son 5 barda aşağı momentum
      const last5Closes = recentCloses.slice(-5);
      const isDownMomentum = last5Closes[4] < last5Closes[0];
      
      return isDownMomentum && currentClose < avgClose;
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Aktif sinyalleri döndürür */
  getActiveSignals() {
    return this.signals;
  }

  /** Motoru durdurur */
  stop() {
    this.isRunning = false;
    // Clear interval to prevent resource leaks
    if (this.scanInterval !== null) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    Logger.info('SignalEngine', 'Sinyal motoru durduruldu');
  }

  /** Durum bilgisi */
  getStatus() {
    return {
      isRunning: this.isRunning,
      signalCount: this.signals.length,
      lastScanTime: this.lastScanTime
    };
  }
}

module.exports = new SignalEngine();