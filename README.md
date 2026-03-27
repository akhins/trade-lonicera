# ⚡ SametAbiTrade - Binance Futures Demo Trading Sistemi

Modern, premium görünümlü Binance Futures demo trading sistemi. Tüm USDT perpetual futures paritelerini otomatik tarar, teknik analiz sinyalleri üretir, demo işlemler açar ve tüm sonuçları veritabanına kaydeder.

> ⚠️ **Bu sistem gerçek para ile işlem AÇMAZ.** Sadece paper trading / demo trading yapar.

---

## 🎯 Sistem Özellikleri

### 🤖 Otomatik Sinyal Üretimi
- Tüm USDT perpetual futures paritelerini tarar
- 15 dakikalık mum verileri ile sinyal üretimi
- 1 saatlik trend filtresi (EMA 9/21)
- Stochastic (50,21,8) + MACD (25,50,9) indikatörleri
- Risk yönetimi: 1:3 risk/reward oranı

### 📊 Teknik Analiz Kuralları
- **Trend Filtresi**: 1H EMA9 > EMA21 = LONG, EMA9 < EMA21 = SHORT
- **Long Sinyali**: Trend UP + Stochastic <20 crossover + MACD histogram >0
- **Short Sinyali**: Trend DOWN + Stochastic >80 crossover + MACD histogram <0
- **Risk Yönetimi**: %1 stop loss, 3x take profit

### 💰 Demo Trading
- Gerçek zamanlı pozisyon takibi
- Otomatik TP/SL kapatma
- P&L hesaplama ve raporlama
- Maksimum açık trade limiti

### 📈 Veritabanı Kayıtları
Her işlem için:
- Parite, yön, entry/stop/take profit
- Risk/reward oranı, P&L
- Açılış/kapanış zamanı, sonuç
- Sinyal nedeni ve indikatör değerleri

---

## 🏗️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Vite + React 18 |
| Stil | Vanilla CSS (Dark Glassmorphism) |
| Grafik | TradingView Lightweight Charts |
| Backend | Node.js + Express |
| Veritabanı | MariaDB / MySQL |
| Gerçek Zamanlı | Socket.IO |
| Telegram | node-telegram-bot-api |
| Binance | REST API (public endpoints) |

## 📁 Proje Yapısı

```
SametAbiTrade/
├── .env                    # Ortam değişkenleri
├── .env.example            # Örnek ortam
├── README.md
├── db.sql                  # Orijinal DB dump
├── database/
│   └── schema.sql          # Genişletilmiş şema
├── backend/
│   ├── server.js           # Ana sunucu
│   ├── config/database.js  # DB bağlantısı
│   ├── middleware/         # Auth, error handler
│   ├── routes/             # API endpoints
│   ├── services/           # İş mantığı
│   │   ├── binanceService.js    # Binance API
│   │   ├── signalEngine.js      # Sinyal üretimi
│   │   ├── tradeEngine.js       # Demo trade yönetimi
│   │   ├── tradingSystem.js     # Ana sistem orchestrator
│   │   ├── strategyEngine.js    # Mevcut sinyal motoru
│   │   └── paperTradingEngine.js # Mevcut paper engine
│   └── utils/
│       ├── indicators.js        # Teknik indikatörler
│       └── logger.js
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css       # Tasarım sistemi
        ├── api/client.js   # Axios + Socket.IO
        ├── context/        # Auth context
        ├── components/     # Layout, Charts
        └── pages/          # 8 sayfa
```

## 🚀 Kurulum ve Çalıştırma

### 1. Gereksinimler
- Node.js 18+
- MySQL/MariaDB
- npm veya yarn

### 2. Veritabanı Kurulumu
```bash
# MySQL/MariaDB'yi başlatın
sudo systemctl start mysql  # Linux
# veya Windows Services'ten başlatın

# Veritabanı ve tabloları oluşturun
cd backend
node init-db.js
```

### 3. Ortam Değişkenleri
`.env` dosyasını oluşturun:
```env
# Veritabanı
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bot

# Sunucu
PORT=3001

# JWT
JWT_SECRET=your_jwt_secret

# Telegram Bot (opsiyonel)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 4. Backend Başlatma
```bash
cd backend
npm install
npm start
# veya geliştirme için:
npm run dev
```

### 5. Frontend Başlatma
```bash
cd frontend
npm install
npm run dev
```

### 6. Sistem Erişimi
- Backend API: http://localhost:3001
- Frontend: http://localhost:5173
- Sistem durumu: http://localhost:3001/api/system/status

---

## 📊 API Endpoints

### Demo Trading
- `GET /api/trades/demo/open` - Açık demo trade'ler
- `GET /api/trades/demo/history` - Trade geçmişi
- `GET /api/trades/demo/stats` - İstatistikler

### Sistem
- `GET /api/system/status` - Sistem durumu
- `GET /api/system/logs` - Sistem logları

---

## 🔧 Sistem Çalışma Mantığı

1. **Sinyal Tarama**: Her 15 dakikada bir tüm USDT pariteleri taranır
2. **Trend Filtresi**: 1 saatlik EMA'lar ile trend yönü belirlenir
3. **İndikatör Hesaplama**: 15 dakikalık Stochastic ve MACD hesaplanır
4. **Sinyal Üretimi**: Kurallara uygun sinyal üretimi
5. **Trade Açma**: Demo trade açılır (max 5 açık trade)
6. **Pozisyon Takibi**: Her dakika TP/SL kontrolü
7. **Kayıt**: Tüm işlemler veritabanına kaydedilir

---

## ⚙️ Yapılandırma

### Risk Parametreleri
- **Risk/Ödül**: 1:3
- **Stop Loss**: %1
- **Max Açık Trade**: 5
- **Kaldıraç**: 10x (demo)

### Zaman Dilimleri
- **Sinyal**: 15 dakika
- **Trend**: 1 saat
- **Tarama**: 15 dakikada bir
- **Takip**: 1 dakikada bir

---

## 📈 İzleme ve Loglama

- Sistem durumu: `/api/system/status`
- Demo trade istatistikleri: `/api/trades/demo/stats`
- Loglar: `/api/system/logs`
- Gerçek zamanlı güncellemeler: Socket.IO

---

## 🔒 Güvenlik

- JWT tabanlı authentication
- Rate limiting
- Input validation
- SQL injection koruması
- Sadece demo trading (gerçek para riski yok)

---

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Push yapın
5. Pull Request açın

## 🚀 Kurulum

### Gereksinimler
- **Node.js** v18+
- **MariaDB** veya **MySQL** (127.0.0.1:3306)
- Telegram Bot Token (isteğe bağlı)

### 1. Veritabanı Kurulumu

```bash
# MariaDB/MySQL'e giriş yap ve bot veritabanını oluştur
mysql -u root -p
CREATE DATABASE IF NOT EXISTS bot;
USE bot;
SOURCE database/schema.sql;
EXIT;
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 4. Giriş Bilgileri

- **Kullanıcı:** `admin`
- **Şifre:** `admin123`

## ⚙️ Konfigürasyon (.env)

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bot
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
PAPER_INITIAL_BALANCE=10000
PAPER_RISK_PERCENT=2
PAPER_COMMISSION_RATE=0.04
```

## 📡 Telegram Sinyal Formatları

Desteklenen formatlar:

**Format 1 — Standart:**
```
🔵 LONG BTCUSDT
Entry: 42000 - 42500
SL: 41000
TP1: 43000
TP2: 44000
TP3: 45000
```

**Format 2 — Kompakt:**
```
BTCUSDT LONG 42000 SL:41000 TP:43000/44000/45000
```

**Format 3 — Detaylı:**
```
📊 Signal Alert
🪙 Symbol: BTCUSDT
📈 Direction: LONG
💰 Entry: 42000-42500
🛑 Stop Loss: 41000
🎯 TP1: 43000
🎯 TP2: 44000
```

## 📊 Paper Trading İş Akışı

```
Telegram Sinyali → Parse → Doğrula → Strateji Motoru
    ↓                                      ↓
DB'ye Kaydet                     Fiyat İzleme Başlat
                                          ↓
                               Entry Zone'a Geldi mi?
                                   ↓          ↓
                                 Evet        Hayır (Expire)
                                   ↓
                            Paper Trade Aç
                                   ↓
                          TP/SL Fiyat İzle
                              ↓        ↓
                           TP Hit    SL Hit
                              ↓        ↓
                        Trade Kapat + PnL Hesapla
                              ↓
                    Bakiye Güncelle + Dashboard Bildir
```

## 📄 API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | /api/auth/login | Giriş |
| GET | /api/dashboard/stats | Dashboard istatistikleri |
| GET | /api/dashboard/market-overview | Market özeti |
| GET | /api/dashboard/system-status | Sistem durumu |
| GET | /api/signals | Sinyal listesi |
| POST | /api/signals/test | Sinyal test et |
| GET | /api/trades/open | Açık işlemler |
| GET | /api/trades/history | İşlem geçmişi |
| GET | /api/analytics/summary | Analiz özeti |
| GET | /api/analytics/export | CSV export |
| GET/PUT | /api/settings | Ayarlar |
| GET | /api/system/logs | Sistem logları |

## 📱 Sayfalar

1. **Login** — Premium giriş ekranı
2. **Dashboard** — Ana panel (bakiye, PnL, sinyaller, market, sistem durumu)
3. **Sinyaller** — Sinyal listesi + test paneli
4. **Açık İşlemler** — Gerçek zamanlı pozisyon takibi
5. **İşlem Geçmişi** — Filtreli geçmiş + CSV export
6. **Analitik** — Detaylı performans raporları
7. **Ayarlar** — Sistem konfigürasyonu
8. **Sistem Logları** — Seviye bazlı log görüntüleme

---

**⚡ SametAbiTrade** — Safe to trade, smart to learn.
#   t r a d e - l o n i c e r a  
 