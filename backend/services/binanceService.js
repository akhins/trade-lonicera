const Logger = require('../utils/logger');
const axios = require('axios');
const https = require('https');

// Create an https agent to bypass strict SSL
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Configure Axios instance
const api = axios.create({
  timeout: 10000,
  httpsAgent,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  }
});

class BinanceService {
  constructor() {
    this.symbols = [];
    this.prices = {};
    this.baseUrl = 'https://fapi.binance.com';
    this.wsConnections = new Map();
    this.isRunning = false;
    this.lastUpdate = null;
  }

  /**
   * Tüm USDT perpetual futures sembollerini çeker
   */
  async fetchSymbols() {
    try {
      const response = await api.get(`${this.baseUrl}/fapi/v1/exchangeInfo`);
      const data = response.data;

      this.symbols = data.symbols
        .filter(s => 
          s.contractType === 'PERPETUAL' && 
          s.quoteAsset === 'USDT' && 
          s.status === 'TRADING'
        )
        .map(s => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          pricePrecision: s.pricePrecision,
          quantityPrecision: s.quantityPrecision,
          contractType: s.contractType
        }));

      this.lastUpdate = new Date();
      await Logger.info('BinanceService', `${this.symbols.length} USDT perpetual futures sembolü yüklendi`);
      return this.symbols;
    } catch (error) {
      await Logger.error('BinanceService', 'Sembol listesi alınamadı', error.message);
      throw error;
    }
  }

  /**
   * Tüm futures sembollerinin fiyatlarını çeker
   */
  async fetchAllPrices() {
    try {
      const response = await api.get(`${this.baseUrl}/fapi/v1/ticker/price`);
      const data = response.data;

      data.forEach(item => {
        this.prices[item.symbol] = {
          price: parseFloat(item.price),
          time: item.time || Date.now()
        };
      });

      return this.prices;
    } catch (error) {
      await Logger.error('BinanceService', 'Fiyat verisi alınamadı', error.message);
      throw error;
    }
  }

  /**
   * Belirli bir sembolün fiyatını çeker
   */
  async fetchPrice(symbol) {
    try {
      const response = await api.get(`${this.baseUrl}/fapi/v1/ticker/price?symbol=${symbol}`);
      const data = response.data;
      const price = parseFloat(data.price);
      this.prices[symbol] = { price, time: Date.now() };
      return price;
    } catch (error) {
      await Logger.error('BinanceService', `${symbol} fiyatı alınamadı`, error.message);
      return this.prices[symbol]?.price || null;
    }
  }

  /**
   * Kline (mum) verisi çeker
   */
  async fetchKlines(symbol, interval = '1h', limit = 100) {
    try {
      const response = await api.get(`${this.baseUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      const data = response.data;

      return data.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));
    } catch (error) {
      await Logger.error('BinanceService', `${symbol} kline verisi alınamadı`, error.message);
      throw error;
    }
  }

  /**
   * Belirli semboller için mark price çeker
   */
  async fetchMarkPrice(symbol) {
    try {
      const response = await api.get(`${this.baseUrl}/fapi/v1/premiumIndex?symbol=${symbol}`);
      const data = response.data;
      return {
        symbol: data.symbol,
        markPrice: parseFloat(data.markPrice),
        indexPrice: parseFloat(data.indexPrice),
        fundingRate: parseFloat(data.lastFundingRate)
      };
    } catch (error) {
      await Logger.error('BinanceService', `${symbol} mark price alınamadı`, error.message);
      throw error;
    }
  }

  /**
   * Periyodik fiyat güncelleme başlatır
   */
  startPriceUpdates(intervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;

    this._priceInterval = setInterval(async () => {
      await this.fetchAllPrices();
    }, intervalMs);

    Logger.info('BinanceService', `Fiyat güncellemeleri başlatıldı (${intervalMs}ms aralıkla)`);
  }

  /**
   * Fiyat güncellemeyi durdurur
   */
  stopPriceUpdates() {
    if (this._priceInterval) {
      clearInterval(this._priceInterval);
      this._priceInterval = null;
    }
    this.isRunning = false;
    Logger.info('BinanceService', 'Fiyat güncellemeleri durduruldu');
  }

  /**
   * Belirli sembol için güncel fiyatı döndürür (cache'den)
   */
  getPrice(symbol) {
    return this.prices[symbol]?.price || null;
  }

  /**
   * Servis durumunu döndürür
   */
  getStatus() {
    return {
      connected: this.symbols.length > 0,
      symbolCount: this.symbols.length,
      priceCount: Object.keys(this.prices).length,
      lastUpdate: this.lastUpdate,
      isRunning: this.isRunning
    };
  }

  /**
   * Sembol geçerliliğini kontrol eder
   */
  isValidSymbol(symbol) {
    return this.symbols.some(s => s.symbol === symbol);
  }

  /**
   * Market overview için top movers hesaplar
   */
  async fetchTopMovers(limit = 10) {
    try {
      const response = await api.get(`${this.baseUrl}/fapi/v1/ticker/24hr`);
      const data = response.data;

      const usdtPairs = data
        .filter(t => t.symbol.endsWith('USDT'))
        .map(t => ({
          symbol: t.symbol,
          price: parseFloat(t.lastPrice),
          priceChange: parseFloat(t.priceChange),
          priceChangePercent: parseFloat(t.priceChangePercent),
          volume: parseFloat(t.quoteVolume),
          high: parseFloat(t.highPrice),
          low: parseFloat(t.lowPrice)
        }));

      const topGainers = [...usdtPairs].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, limit);
      const topLosers = [...usdtPairs].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, limit);
      const topVolume = [...usdtPairs].sort((a, b) => b.volume - a.volume).slice(0, limit);

      return { topGainers, topLosers, topVolume };
    } catch (error) {
      await Logger.error('BinanceService', 'Top movers alınamadı', error.message);
      return { topGainers: [], topLosers: [], topVolume: [] };
    }
  }
}

module.exports = new BinanceService();
