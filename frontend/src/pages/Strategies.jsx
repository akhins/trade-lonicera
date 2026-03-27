import React, { useState } from 'react';
import './Strategies.css';

const Strategies = () => {
  const [activeStrategy, setActiveStrategy] = useState('stochastic');

  const strategies = {
    stochastic: {
      name: 'Stochastic + MACD Strateji',
      type: 'Birincil Strateji',
      color: '#00d4ff',
      description: 'Momentumu tespit etmek için Stochastic Oscillator ve MACD indikatörleri kullanır.',
      
      flow: [
        {
          step: 1,
          title: '1 Saatlik Trend Filtresi',
          description: 'Binance Futures API\'den gelen 1 saatlik mum verisi ile trend yönü belirlenir.',
          details: [
            '📈 EMA9 (Exponential Moving Average 9 periyot)',
            '📉 EMA21 (Exponential Moving Average 21 periyot)',
            '🎯 LONG: Fiyat > EMA9 ve EMA9 > EMA21',
            '🎯 SHORT: Fiyat < EMA9 ve EMA9 < EMA21'
          ]
        },
        {
          step: 2,
          title: '15 Dakikalık Sinyal Üretimi',
          description: '15 dakikalık mum verisi ile detaylı analiz yapılır.',
          details: [
            '📊 Stochastic Oscillator (K=50, Smooth=21, D=8)',
            '📈 MACD (Fast=25, Slow=50, Signal=9)',
            '⚡ Son 200 mum verisi analiz edilir'
          ]
        },
        {
          step: 3,
          title: 'Stochastic Sinyal Kontrolü',
          description: 'Stochastic K ve D değerleri crossover analizi yapılır.',
          details: [
            '🔴 LONG: K < 50 ve K > D (Oversold bölgesinden çıkış)',
            '🔵 SHORT: K > 50 ve K < D (Overbought bölgesinden çıkış)',
            '✅ Açı ve momentum kontrol edilir'
          ]
        },
        {
          step: 4,
          title: 'MACD Sinyal Kontrolü',
          description: 'MACD histogram ve crossover sinyalleri kontrol edilir.',
          details: [
            '🟢 LONG: MACD > Signal ve Histogram > 0',
            '🔴 SHORT: MACD < Signal ve Histogram < 0',
            '💪 Momentum güç durumu doğrulanır'
          ]
        },
        {
          step: 5,
          title: 'ATR Bazlı Risk Yönetimi',
          description: 'Stop Loss ve Take Profit seviyeleri ATR değerine göre hesaplanır.',
          details: [
            '📏 ATR = Average True Range (14 periyot)',
            '📌 LONG: SL = Entry - (ATR × 1.5), TP = Entry + (ATR × 3)',
            '📌 SHORT: SL = Entry + (ATR × 1.5), TP = Entry - (ATR × 3)',
            '⚖️ Risk/Reward = 1:2'
          ]
        }
      ],

      signals: {
        long: {
          title: '🟢 LONG Sinyali Koşulları',
          conditions: [
            '✓ 1H Trend: Fiyat > EMA9 ve EMA9 > EMA21',
            '✓ 15M Stochastic: K < 50 ve K > D (Crossover)',
            '✓ 15M MACD: MACD > Signal (Crossover)',
            '✓ 15M Histogram: > 0 (Pozitif momentum)'
          ],
          entry: 'Mevcut kapanış fiyatı (close) İşlem aç',
          tp: 'Entry + (ATR × 3)',
          sl: 'Entry - (ATR × 1.5)'
        },
        short: {
          title: '🔴 SHORT Sinyali Koşulları',
          conditions: [
            '✓ 1H Trend: Fiyat < EMA9 ve EMA9 < EMA21',
            '✓ 15M Stochastic: K > 50 ve K < D (Crossover)',
            '✓ 15M MACD: MACD < Signal (Crossover)',
            '✓ 15M Histogram: < 0 (Negatif momentum)'
          ],
          entry: 'Mevcut kapanış fiyatı (close) İşlem aç',
          tp: 'Entry - (ATR × 3)',
          sl: 'Entry + (ATR × 1.5)'
        }
      },

      parameters: [
        { name: 'Tarama Sıklığı', value: '15 dakikada bir' },
        { name: 'Trend Aralığı', value: '1 saatlik (60m)' },
        { name: 'Sinyal Aralığı', value: '15 dakikalık (15m)' },
        { name: 'Stochastic (K)', value: '50 periyot' },
        { name: 'Stochastic (Smooth K)', value: '21' },
        { name: 'Stochastic (D)', value: '8' },
        { name: 'MACD (Fast)', value: '25' },
        { name: 'MACD (Slow)', value: '50' },
        { name: 'MACD (Signal)', value: '9' },
        { name: 'ATR', value: '14 periyot' },
        { name: 'Risk/Reward', value: '1:2 (ATR bazlı)' },
        { name: 'Max Açık Trade', value: '10' }
      ]
    },

    fibonacci: {
      name: 'Fibonacci + Pivot Points Strateji',
      type: 'Alternatif Strateji',
      color: '#ffd700',
      description: 'Destek ve direnç seviyelerini Fibonacci ve Pivot Points kullanarak tespit eder.',
      
      flow: [
        {
          step: 1,
          title: 'Fibonacci Retracement Seviyeleri',
          description: 'Son 100 bar için en yüksek ve en düşük fiyatlar belirlenir.',
          details: [
            '📊 Lookback: Son 100 mum verisi',
            '📈 High: En yüksek fiyat',
            '📉 Low: En düşük fiyat',
            '📐 Fark = High - Low'
          ]
        },
        {
          step: 2,
          title: 'Fibonacci Seviyeleri Hesaplanması',
          description: 'Standart Fibonacci oranları kullanarak seviyeleri hesapla.',
          details: [
            '0%: Low (Taban)',
            '23.6%: Low + (Fark × 0.236)',
            '38.2%: Low + (Fark × 0.382)',
            '50%: Low + (Fark × 0.500)',
            '61.8%: Low + (Fark × 0.618) ⭐ Altın Oran',
            '78.6%: Low + (Fark × 0.786)',
            '100%: High (Zirve)'
          ]
        },
        {
          step: 3,
          title: 'Pivot Points Hesaplanması',
          description: 'Daily High/Low/Close kullanarak Pivot seviyeleri hesapla.',
          details: [
            '🔧 Pivot = (High + Low + Close) / 3',
            '🔴 R3 = High + 2 × (Pivot - Low)',
            '🔴 R2 = Pivot + (High - Low)',
            '🔴 R1 = 2 × Pivot - Low',
            '⚪ Pivot = Orta seviye',
            '🟢 S1 = 2 × Pivot - High',
            '🟢 S2 = Pivot - (High - Low)',
            '🟢 S3 = Low - 2 × (High - Pivot)'
          ]
        },
        {
          step: 4,
          title: 'Breakout Kontrolü',
          description: 'Fiyat Fibonacci veya Pivot seviyelerinden kırılma yapıyor mu kontrol et.',
          details: [
            '💥 Fibonacci 61.8% veya Pivot R1/R2 kırılması',
            '📍 Tolerans: Seviye farkının %0.2\'si',
            '🎯 Breakout sinyali üretilir'
          ]
        },
        {
          step: 5,
          title: 'Momentum Doğrulaması',
          description: 'Sinyali doğrulamak için son 20 bar momentum kontrol edilir.',
          details: [
            '📈 LONG: Kapanışlar yükseliş eğiliminde',
            '📉 SHORT: Kapanışlar düşüş eğiliminde',
            '🔄 Son 5 bar momentum kontrolü',
            '✅ Sinyal gerçekleştirilir'
          ]
        }
      ],

      signals: {
        long: {
          title: '🟢 LONG Sinyali - Fibonacci',
          conditions: [
            '✓ Fib 61.8% veya 50% seviyesinde support bulundu',
            '✓ Fiyat bu seviyeden zıplayarak diriliş başladı',
            '✓ Son 5 bar kapanışlar yükseliş eğiliminde',
            '✓ Ortalama kapanışın üstündeyiz'
          ],
          entry: 'Mevcut fiyat',
          tp: 'Fib 78.6% veya Pivot R1/R2',
          sl: 'Fib 38.2% altında'
        },
        short: {
          title: '🔴 SHORT Sinyali - Fibonacci',
          conditions: [
            '✓ Fib 38.2% veya 61.8% seviyesinde resistance vardı',
            '✓ Fiyat bu seviyeden düşerek dalgalandı',
            '✓ Son 5 bar kapanışlar düşüş eğiliminde',
            '✓ Ortalama kapanışın altındayız'
          ],
          entry: 'Mevcut fiyat',
          tp: 'Fib 23.6% veya Pivot S1/S2',
          sl: 'Fib 78.6% üstünde'
        }
      },

      parameters: [
        { name: 'Fibonacci Lookback', value: '100 bar' },
        { name: 'Aralar', value: '15 dakika' },
        { name: 'Pivot Hesaplama', value: 'Daily (96 × 15m)' },
        { name: 'Breakout Toleransı', value: 'Seviye farkı × 0.2%' },
        { name: 'Momentum Dönem', value: 'Son 20 bar' },
        { name: 'Fibonacci Seviyeleri', value: '23.6%, 38.2%, 50%, 61.8%, 78.6%' },
        { name: 'Pivot Seviyeleri', value: 'S3, S2, S1, Pivot, R1, R2, R3' },
        { name: 'Risk/Reward', value: '1:2 (ATR bazlı)' }
      ]
    }
  };

  const current = strategies[activeStrategy];

  return (
    <div className="strategies-container">
      {/* Header */}
      <div className="strategies-header">
        <h1>🤖 Trading Stratejileri</h1>
        <p>Sistem nasıl çalışıyor? Stratejilerin detaylı açıklaması</p>
      </div>

      {/* Strategy Selector */}
      <div className="strategy-selector">
        <button
          className={`strategy-btn ${activeStrategy === 'stochastic' ? 'active' : ''}`}
          onClick={() => setActiveStrategy('stochastic')}
        >
          <span className="btn-number">1️⃣</span>
          <span className="btn-text">
            <strong>Stochastic + MACD</strong>
            <small>Birincil Strateji</small>
          </span>
        </button>
        <button
          className={`strategy-btn ${activeStrategy === 'fibonacci' ? 'active' : ''}`}
          onClick={() => setActiveStrategy('fibonacci')}
        >
          <span className="btn-number">2️⃣</span>
          <span className="btn-text">
            <strong>Fibonacci + Pivot</strong>
            <small>Alternatif Strateji</small>
          </span>
        </button>
      </div>

      <div className="strategies-content">
        {/* Strategy Info */}
        <div className="strategy-header-info">
          <div className="strategy-title">
            <h2>{current.name}</h2>
            <span className="strategy-type">{current.type}</span>
          </div>
          <p className="strategy-description">{current.description}</p>
        </div>

        {/* Flow Chart */}
        <section className="strategy-section">
          <h3>📊 Sistem Akışı</h3>
          <div className="flow-chart">
            {current.flow.map((item, idx) => (
              <div key={idx} className="flow-item">
                <div className="flow-step">{item.step}</div>
                <div className="flow-content">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <ul className="flow-details">
                    {item.details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                </div>
                {idx < current.flow.length - 1 && <div className="flow-arrow">⬇️</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Signal Conditions */}
        <section className="strategy-section">
          <h3>🎯 Sinyal Koşulları</h3>
          <div className="signals-grid">
            <div className="signal-card long-signal">
              <h4>{current.signals.long.title}</h4>
              <div className="conditions">
                {current.signals.long.conditions.map((cond, idx) => (
                  <div key={idx} className="condition">{cond}</div>
                ))}
              </div>
              <div className="signal-levels">
                <div className="level entry">
                  <strong>📍 Giriş:</strong> {current.signals.long.entry}
                </div>
                <div className="level tp">
                  <strong>📈 TP:</strong> {current.signals.long.tp}
                </div>
                <div className="level sl">
                  <strong>📉 SL:</strong> {current.signals.long.sl}
                </div>
              </div>
            </div>

            <div className="signal-card short-signal">
              <h4>{current.signals.short.title}</h4>
              <div className="conditions">
                {current.signals.short.conditions.map((cond, idx) => (
                  <div key={idx} className="condition">{cond}</div>
                ))}
              </div>
              <div className="signal-levels">
                <div className="level entry">
                  <strong>📍 Giriş:</strong> {current.signals.short.entry}
                </div>
                <div className="level tp">
                  <strong>📈 TP:</strong> {current.signals.short.tp}
                </div>
                <div className="level sl">
                  <strong>📉 SL:</strong> {current.signals.short.sl}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Parameters */}
        <section className="strategy-section">
          <h3>⚙️ Strateji Parametreleri</h3>
          <div className="parameters-grid">
            {current.parameters.map((param, idx) => (
              <div key={idx} className="param-card">
                <div className="param-name">{param.name}</div>
                <div className="param-value">{param.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section className="strategy-section">
          <h3>✨ Önemli Özellikler</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h4>Otomatik İşletim</h4>
              <p>Sistem 15 dakikada bir tüm piyasayı tarar ve sinyal üretir</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h4>Risk Yönetimi</h4>
              <p>ATR bazlı dinamik stop loss ve take profit hesaplaması</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h4>Gerçek Zamanlı</h4>
              <p>Socket.IO ile anlık piyasa fiyatları ve işlem güncellemeleri</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💾</div>
              <h4>Tüm Veriler Kaydedilir</h4>
              <p>Her işlem ve sinyal detaylı olarak veritabanına kaydedilir</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h4>İkili Strateji</h4>
              <p>Stochastic+MACD başarısız olursa Fibonacci+Pivot devreye girer</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏱️</div>
              <h4>Dual Timeframe</h4>
              <p>1H trend filtresi + 15M sinyal üretimi kombinasyonu</p>
            </div>
          </div>
        </section>

        {/* Info Box */}
        <section className="info-box">
          <div className="info-content">
            <h4>ℹ️ Bilgilendirme</h4>
            <ul>
              <li>✅ Sistem <strong>gerçek para kullanmaz</strong> - sadece paper trading yapar</li>
              <li>✅ Tüm işlemler <strong>Binance Public API</strong>'den gelen verilerle yapılır</li>
              <li>✅ Her işlem <strong>ATR bazlı</strong> risk yönetimiyle yapılır</li>
              <li>✅ Maksimum <strong>10 açık işlem</strong> sınırı vardır</li>
              <li>✅ İşlem geçmişi ve istatistikler <strong>Analytics</strong> sayfasında gösterilir</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Strategies;
