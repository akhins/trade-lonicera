const Logger = require('../utils/logger');
const signalEngine = require('./signalEngine');
const tradeEngine  = require('./tradeEngine');
const binanceService = require('./binanceService');

/**
 * Ana Trading Sistemi v2
 * ─────────────────────────────────────────────
 * Otomatik tarama pipeline'ını yönetir:
 *   1. binanceService  → USDT perpetual sembolleri ve fiyatları çeker
 *   2. signalEngine    → 15m teknik analiz, 1h trend filtresi ile sinyal üretir
 *   3. tradeEngine     → sinyalleri trade'e dönüştürür, TP/SL izler, DB'ye kaydeder
 *
 * Bu sistem Telegram akışından bağımsız çalışır.
 */
class TradingSystem {
  constructor() {
    this.isRunning = false;
    this.scanInterval  = null;
    this.scanIntervalMs = 15 * 60 * 1000; // 15 dakika
  }

  /**
   * Sistemi başlatır
   */
  async initialize() {
    try {
      await Logger.info('TradingSystem', '🚀 Demo Trading Sistemi başlatılıyor...');

      // Trade motorunu başlat (DB'den açık trade'leri yükler + pozisyon izlemeyi başlatır)
      await tradeEngine.initialize();

      // Sinyal motorunu başlat (openTrades referansı ile duplicate guard sağlanır)
      await signalEngine.initialize(tradeEngine.getOpenTradesMap());

      // isRunning bayrağını döngü başlamadan önce true yapmalıyız
      this.isRunning = true;

      // Sinyalleri trade'e dönüştüren asenkron ana döngüyü çalıştır
      this.startMainLoop().catch(err => {
        Logger.error('TradingSystem', 'Ana döngü kritikal hatası', err.message);
        this.isRunning = false;
      });

      await Logger.info('TradingSystem', '✅ Demo Trading Sistemi başarıyla başlatıldı');

    } catch (error) {
      await Logger.error('TradingSystem', 'Sistem başlatma hatası', error.message);
      // Kritik hata olsa da sistemi çökertme — diğer servisler çalışmaya devam etsin
    }
  }

  /**
   * Ana döngüyü başlatır:
   * SignalEngine 15 dakikada bir tarama yapar, bu döngü taramayı bekler ve bitince sinyalleri trade'e dönüştürür.
   * Asenkron while döngüsü sayesinde tarama ile sinyal işleme arasında senkronizasyon garanti edilir.
   */
  async startMainLoop() {
    Logger.info('TradingSystem', 
      `Ana döngü başlatıldı (${this.scanIntervalMs / 60000} dakikada bir tarama yapılacak)`
    );

    while (this.isRunning) {
      try {
        // 1. Taramayı başlat ve bitmesini bekle (2-3 dakika sürebilir)
        await signalEngine.scanAllSymbols();

        // 2. Tarama tamamlandıktan sonra bulunan sinyalleri işle
        await this._processPendingSignals();

      } catch (error) {
        await Logger.error('TradingSystem', 'Ana döngü hatası', error.message);
        // Continue loop even on error to maintain system resilience
      }

      // 3. Bir sonraki tarama için bekle
      if (this.isRunning) {
        await Logger.info('TradingSystem', `Bir sonraki tarama için ${this.scanIntervalMs / 60000} dakika bekleniyor...`);
        // Use a loop with isRunning check for graceful shutdown
        for (let i = 0; i < this.scanIntervalMs; i += 1000) {
          if (!this.isRunning) break;
          await this._sleep(Math.min(1000, this.scanIntervalMs - i));
        }
      }
    }
    
    await Logger.info('TradingSystem', 'Ana döngü sona erdi');
  }

  /**
   * signalEngine'deki aktif sinyalleri alır ve tradeEngine'e iletir
   */
  async _processPendingSignals() {
    try {
      const signals = signalEngine.getActiveSignals();

      if (signals.length === 0) {
        await Logger.info('TradingSystem', 'İşlenecek sinyal yok');
        return;
      }

      await Logger.info('TradingSystem', `${signals.length} sinyal işleniyor...`);

      for (const signal of signals) {
        try {
          const opened = await tradeEngine.openTrade(signal);
          if (opened) {
            await Logger.info('TradingSystem',
              `Yeni trade açıldı: ${signal.symbol} ${signal.direction}`
            );
          }

          // Her sinyal arasında kısa bekleme (DB write thrashing'i önler)
          await this._sleep(200);
        } catch (err) {
          await Logger.error('TradingSystem',
            `${signal.symbol} trade açma hatası`, err.message
          );
        }
      }

    } catch (error) {
      await Logger.error('TradingSystem', 'Sinyal işleme hatası', error.message);
    }
  }

  /**
   * Sistemi durdurur
   */
  async stop() {
    try {
      this.isRunning = false;

      // Döngüyü bekleme iptali (beklerken uyanması için ekstra lojik eklenebilir ama isRunning yeterli)
      signalEngine.stop();
      tradeEngine.stop();

      await Logger.info('TradingSystem', '🛑 Demo Trading Sistemi durduruldu');
    } catch (error) {
      await Logger.error('TradingSystem', 'Sistem durdurma hatası', error.message);
    }
  }

  /**
   * Sistem durumunu döndürür
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      signalEngine: signalEngine.getStatus(),
      tradeEngine: tradeEngine.getStatus(),
      binance: binanceService.getStatus()
    };
  }

  /**
   * Sistem istatistiklerini döndürür (API endpoint için)
   */
  getStats() {
    const tradeStats  = tradeEngine.getStats();
    const signalStats = signalEngine.getStatus();

    return {
      ...tradeStats,
      totalSignals:   signalStats.signalCount,
      lastSignalScan: signalStats.lastScanTime
    };
  }

  /** Acil durdurma */
  emergencyStop() {
    Logger.error('TradingSystem', '🆘 ACİL DURDURMA AKTİF!');
    this.stop();
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new TradingSystem();