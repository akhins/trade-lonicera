# ⚡ SametAbiTrade - Paper Trading Dashboard

Modern, premium görünümlü Binance Futures paper trading dashboard. Telegram sinyallerini alır, strateji motorunda test eder, simüle edilmiş işlemler açar/kapatır ve tüm sonuçları dashboard üzerinde gösterir.

> ⚠️ **Bu sistem gerçek para ile işlem AÇMAZ.** Sadece paper trading / demo trading yapar.

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
│   └── utils/              # Logger, helpers
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
