# 🚀 Trade-Lonicera - Binance Futures Otomatik Trading Sistemi

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-18+-success)

Profesyonel Binance Futures otomatik trading botu. Tüm USDT perpetual pariteleri tarar, ATR bazlı TP-SL ile 1:2 risk/reward oranı kullanarak sinyal üretir ve paper trading yapılır.

> ⚠️ **Demo Trading:** Gerçek para ile işlem yapmaz. Sadece kağıt üzerinde (paper) işlem simülasyonu yapar.

---

## ✨ Ana Özellikler

### 🤖 İkili Strateji Sistemi

**Strateji 1: Stochastic + MACD (Birincil)**
- 1 saatlik trend filtresi (EMA 9/21)
- 15 dakikalık Stochastic (50, 21, 8)
- 15 dakikalık MACD (25, 50, 9)
- Crossover sinyalleri
- ATR bazlı dinamik TP/SL

**Strateji 2: Fibonacci + Pivot Points (Alternatif)**
- Fibonacci Retracement Seviyeleri (23.6%, 38.2%, 50%, 61.8%, 78.6%)
- Pivot Point Destek/Direnç (S3, S2, S1, Pivot, R1, R2, R3)
- Breakout tabanlı sinyal üretimi
- Momentum doğrulaması

### 📊 Risk Yönetimi

```
Position Size    → Bakiye × Risk %
Stop Loss        → Entry - (ATR × 1.5)  [LONG]
Take Profit      → Entry + (ATR × 3)    [LONG]
Risk/Reward      → 1:2 (ATR bazlı)
Max Açık Trade   → 10
Kaldıraç         → 5x (Demo)
```

### 📈 Otomatik Tarama

- 540 USDT futures paritesi taranır
- 15 dakikada bir tarama döngüsü
- Binance Futures API (Realtime fiyatlar)
- Rate limiting ile optimize edilmiş
- Concurrent scanning (10 parite paralel)

### 💰 Demo Trading Engine

- Gerçek zamanlı P&L hesaplama
- Otomatik TP/SL kapatma (dakikada kontrol)
- Trade geçmişi ve istatistikler
- Gelir/kayıp raporları
- Paper bakiye yönetimi ($10,000 başlangıç)

### 📱 Telegram Entegrasyonu

- Sinyal aldığınızda Telegram'dan bildirim
- Sinyal parser sistemi (4 format desteklenir)
- Trade açılış/kapanış bildirimleri

---

## 🏗️ Teknoloji Yığını

```
Backend
├── Node.js 18+
├── Express.js
├── MySQL/MariaDB
├── Socket.IO (Realtime)
└── Binance API

Frontend
├── React 18
├── Vite
├── TradingView Lightweight Charts
├── Vanilla CSS (Glassmorphism)
└── Socket.IO Client

Stratégikler
├── EMA (Exponential Moving Average)
├── Stochastic Oscillator
├── MACD (Moving Average Convergence Divergence)
├── ATR (Average True Range)
├── Fibonacci Retracement
└── Pivot Points
```

### 📁 Proje Yapısı

```
trade-lonicera/
│
├── backend/
│   ├── server.js                    # Ana sunucu
│   ├── init-db.js                   # DB kurulumu
│   ├── package.json
│   │
│   ├── config/
│   │   └── database.js              # MySQL bağlantı
│   │
│   ├── services/
│   │   ├── binanceService.js        # Binance API
│   │   ├── signalEngine.js          # Sinyal motoru (Fib+Pivot+Stoch+MACD)
│   │   ├── tradeEngine.js           # Pozisyon yönetimi
│   │   ├── tradingSystem.js         # Ana orchestrator
│   │   ├── paperTradingEngine.js    # Demo trading
│   │   ├── strategyEngine.js        # Strateji takibi (legacy)
│   │   └── telegramService.js       # Telegram bot
│   │
│   ├── routes/
│   │   ├── auth.js                  # Login
│   │   ├── dashboard.js             # Dashboard verileri
│   │   ├── signals.js               # Sinyal CRUD
│   │   ├── trades.js                # Demo trade verisi
│   │   ├── analytics.js             # İstatistikler
│   │   ├── settings.js              # Ayarlar
│   │   └── system.js                # Sistem durum/log
│   │
│   ├── middleware/
│   │   ├── auth.js                  # JWT doğrulaması
│   │   └── errorHandler.js          # Hata yönetimi
│   │
│   └── utils/
│       ├── indicators.js            # Teknik indikatörler
│       ├── helpers.js               # Yardımcı fonksiyonlar
│       └── logger.js                # Sistem logging
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   │
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css                # Design system
│       │
│       ├── api/
│       │   └── client.js            # Axios + Socket.IO
│       │
│       ├── context/
│       │   └── AuthContext.jsx      # Auth state
│       │
│       ├── components/
│       │   ├── ErrorBoundary.jsx
│       │   ├── Layout/
│       │   │   ├── Header.jsx
│       │   │   ├── Sidebar.jsx
│       │   │   └── TickerBar.jsx
│       │   └── Dashboard/
│       │       ├── MarketSentiment.jsx
│       │       └── PortfolioChart.jsx
│       │
│       └── pages/
│           ├── Dashboard.jsx        # Ana dashboard
│           ├── Signals.jsx          # Sinyal listesi
│           ├── OpenTrades.jsx       # Açık işlemler
│           ├── TradeHistory.jsx     # Geçmiş işlemler
│           ├── Analytics.jsx        # İstatistikler
│           ├── SystemLogs.jsx       # Sistem logları
│           ├── Settings.jsx         # Ayarlar
│           └── Login.jsx            # Giriş sayfası
│
├── database/
│   └── schema.sql                   # MySQL şeması
│
└── .env                             # Ortam değişkenleri
```

---

## 🚀 Kurulum Adımları

### Step 1: Repository'yi Klonla

```bash
git clone https://github.com/akhins/trade-lonicera.git
cd trade-lonicera
```

### Step 2: Gereksinimler

**Gerekli Yazılımlar:**
- Node.js 18+ ([İndir](https://nodejs.org/))
- MySQL veya MariaDB ([İndir](https://www.mariadb.org/download/))
- Git ([İndir](https://git-scm.com/))

**Windows'ta MySQL kurulumu:**
```bash
# MSI installer'ı indirin ve kurulum sırasında:
# - Port: 3306
# - User: root
# - Password: (boş bırakabilirsin)
```

**Linux'ta (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mariadb-server mariadb-client
sudo systemctl start mariadb
sudo mysql_secure_installation
```

### Step 3: Veritabanı Kurulumu

```bash
# MySQL'e bağlan ve veritabanı oluştur
mysql -u root -p
```

```sql
CREATE DATABASE IF NOT EXISTS bot;
USE bot;
SOURCE /path/to/database/schema.sql;
EXIT;
```

Veya terminal'den direkt:
```bash
mysql -u root -p < database/schema.sql
```

### Step 4: Backend Kurulumu

```bash
cd backend
npm install

# .env dosyasını oluştur
cp .env.example .env
```

**.env dosyasını düzenle:**
```env
# Veritabanı
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=          # MySQL şifresi (boş ise boş bırak)
DB_NAME=bot

# Sunucu
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Telegram (İsteğe bağlı)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# Paper Trading
PAPER_INITIAL_BALANCE=10000
PAPER_RISK_PERCENT=2
PAPER_COMMISSION_RATE=0.04
```

**Backend'i başlat:**
```bash
npm run dev
# → http://localhost:3001
```

### Step 5: Frontend Kurulumu

**Yeni terminal penceresi açın:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Step 6: Sistem Girişi

```
URL:      http://localhost:5173
Kullanıcı: admin
Şifre:     admin123
```

---

## 🎮 Sistemi Kullanma

### Dashboard
- Açık işlemler
- Günlük P&L
- Portföy dağılımı
- Sistem durumu

### Sinyaller
- Tüm üretilen sinyalleri göster
- Manuel sinyal ekleme
- Sistem tarafından otomatik tarafından algılanan sinyallerATR bazlı TP/SL

### Açık İşlemler
- Gerçek zamanlı pozisyon takibi
- Manual kapatma (demo)
- P&L değişimi

### İstatistikler
- Kazanma oranı
- Ortalama almış ve kaybıyla oranı
- Toplam kazanç/kayıp
- Aylık performans

### Sistem Logları
- Tüm işlem logları
- Hata kayıtları
- Başarılı trade logları

---

## 🔌 Telegram Sinyal Format Örnekleri

Bot Telegram'dan sinyal alabilir. Desteklenen formatlar:

**Format 1 - Standart:**
```
🔵 LONG BTCUSDT
Entry: 42000 - 42500
SL: 41000
TP1: 43000
TP2: 44000
TP3: 45000
```

**Format 2 - Kompakt:**
```
BTCUSDT LONG 42000 SL:41000 TP:43000
```

**Format 3 - Detaylı:**
```
📊 Trading Signal
Symbol: BTCUSDT
Direction: LONG
Entry Zone: 42000 - 42500
Stop Loss: 41000
Take Profit: 43000 / 44000 / 45000
```

---

## 📊 Sinyal Algoritması

### Stochastic + MACD Strateji

```
TARAMA SIRALAMASI:
1. 1 saatlik fiyat verisini al
2. EMA9 ve EMA21 hesapla
3. Trend yönünü belirle (UP/DOWN)
   - UP: Fiyat > EMA9 ve EMA21
   - DOWN: Fiyat < EMA9 ve EMA21
4. 15 dakikalık veriyi al
5. Stochastic (50,21,8) hesapla
6. MACD (25,50,9) hesapla
7. Sinyal koşullarını kontrol et
```

### LONG Sinyali
```
✓ Trend = UP
✓ Stochastic K < 50
✓ K > D (Crossover)
✓ MACD > Signal
✓ Histogram > 0
```

### SHORT Sinyali
```
✓ Trend = DOWN
✓ Stochastic K > 50
✓ K < D (Crossover)
✓ MACD < Signal
✓ Histogram < 0
```

### Risk Yönetimi (ATR Bazlı)
```
ATR = Average True Range (14 periyot)

LONG:
  SL = Entry - (ATR × 1.5)
  TP = Entry + (ATR × 3)
  RR = 1:2

SHORT:
  SL = Entry + (ATR × 1.5)
  TP = Entry - (ATR × 3)
  RR = 1:2
```

---

## 🐛 Sorun Giderme

### MySQL Bağlantısı Hatası
```
ERROR: connect ECONNREFUSED 127.0.0.1:3306
```
**Çözüm:**
```bash
# MySQL servisini başla
sudo systemctl start mariadb      # Linux
# veya Windows Services'ten başlat
```

### Port Zaten Kullanımda
```
ERROR: listen EADDRINUSE :::3001
```
**Çözüm:**
```bash
# Process'i öldür (Windows)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# veya Port değiştir .env'de:
PORT=3002
```

### Module Bulunamadı
```
ERROR: Cannot find module 'express'
```
**Çözüm:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### CORS Hatası
**Çözüm:** Frontend ve backend URL'leri doğru kontrol et
```
Backend:  http://localhost:3001
Frontend: http://localhost:5173
```

---

## 📚 API Endpoints

### Authentication
```
POST /api/auth/register         # Kayıt
POST /api/auth/login            # Giriş
GET  /api/auth/profile          # Profil
```

### Dashboard
```
GET /api/dashboard/summary      # Özet istatistikler
GET /api/dashboard/performance  # Performans
```

### Signals
```
GET  /api/signals               # Tüm sinyaller
POST /api/signals               # Yeni sinyal
GET  /api/signals/:id           # Sinyal detayı
PUT  /api/signals/:id           # Sinyal güncelle
```

### Trades
```
GET  /api/trades/demo/open      # Açık işlemler
GET  /api/trades/demo/history   # İşlem geçmişi
GET  /api/trades/demo/stats     # İstatistikler
POST /api/trades/demo/close/:id # İşlemi kapat
```

### System
```
GET /api/system/status          # Sistem durumu
GET /api/system/logs            # Sistem logları
```

---

## 🔐 Güvenlik

- ✅ JWT tabanlı authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS protection
- ✅ Input validation & sanitization
- ✅ Rate limiting
- ✅ SQL injection protection (prepared statements)
- ✅ Demo trading (gerçek para riski yok)

---

## 📞 Destek ve Katkısı

Sorun buldum? Özellik önerisi var mı?
- Issues: [GitHub Issues](https://github.com/akhins/trade-lonicera/issues)
- Discussions: [GitHub Discussions](https://github.com/akhins/trade-lonicera/discussions)

---

## 📄 Lisans

MIT License - [LICENSE](LICENSE) dosyasına bakın

---

## 💡 Disclaimer

⚠️ **Önemli:**
- Bu sistem **hiçbir zaman gerçek para ile işlem yapmaz**
- Sadece paper trading / backtesting amacıyla kullanılır
- Geçmiş performans gelecekteki sonuçları garantilemez
- Trading yapan kişi tüm sorumlulukları üstlenir
- Lütfen sağlamını anlamadan trade etmeyin

---

**Geliştirici:** Akhins  
**Sürüm:** 2.1.0  
**Son Güncelleme:** 27 Mart 2026
