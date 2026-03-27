/**
 * Demo Trading Sistemi Test Scripti
 * Veritabanı olmadan temel fonksiyonları test eder
 */

const TechnicalIndicators = require('./backend/utils/indicators');

// Test verisi - BTCUSDT 15m klines (örnek)
const testKlines = [
  { time: 1640995200, open: 43000, high: 43500, low: 42800, close: 43200, volume: 100 },
  { time: 1640996100, open: 43200, high: 43800, low: 43100, close: 43500, volume: 120 },
  { time: 1640997000, open: 43500, high: 44000, low: 43300, close: 43700, volume: 110 },
  { time: 1640997900, open: 43700, high: 44200, low: 43500, close: 43900, volume: 130 },
  { time: 1640998800, open: 43900, high: 44400, low: 43700, close: 44100, volume: 125 },
  // Daha fazla veri eklenebilir...
];

async function testIndicators() {
  console.log('🧪 Teknik İndikatör Testi Başlıyor...\n');

  const prices = testKlines.map(k => k.close);
  const highs = testKlines.map(k => k.high);
  const lows = testKlines.map(k => k.low);

  // EMA test
  console.log('📈 EMA Hesaplama Testi:');
  const ema9 = TechnicalIndicators.calculateEMA(prices, 9);
  const ema21 = TechnicalIndicators.calculateEMA(prices, 21);
  console.log(`EMA9: [${ema9.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);
  console.log(`EMA21: [${ema21.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);

  // Stochastic test
  console.log('\n📊 Stochastic Hesaplama Testi:');
  const stochastic = TechnicalIndicators.calculateStochastic(highs, lows, prices, 50, 21, 8);
  if (stochastic.k.length > 0) {
    console.log(`%K: [${stochastic.k.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);
    console.log(`%D: [${stochastic.d.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);
  }

  // MACD test
  console.log('\n📉 MACD Hesaplama Testi:');
  const macd = TechnicalIndicators.calculateMACD(prices, 25, 50, 9);
  if (macd.macd.length > 0) {
    console.log(`MACD: [${macd.macd.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);
    console.log(`Signal: [${macd.signal.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);
    console.log(`Histogram: [${macd.histogram.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);
  }

  // Trend test
  console.log('\n📊 Trend Analizi Testi:');
  const trend = TechnicalIndicators.getTrendDirection(prices, 9, 21);
  console.log(`Trend Yönü: ${trend}`);

  console.log('\n✅ İndikatör testleri tamamlandı!');
}

// Sistemi başlat
if (require.main === module) {
  testIndicators().catch(console.error);
}

module.exports = { testIndicators };