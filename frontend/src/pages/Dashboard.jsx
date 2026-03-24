import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { connectSocket } from '../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [recentSignals, setRecentSignals] = useState([]);
  const [pairPerformance, setPairPerformance] = useState({ topPairs: [], worstPairs: [] });
  const [marketOverview, setMarketOverview] = useState({ topGainers: [], topLosers: [] });
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tradesRes, signalsRes, pairsRes, marketRes, statusRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-trades'),
        api.get('/dashboard/recent-signals'),
        api.get('/dashboard/top-pairs'),
        api.get('/dashboard/market-overview'),
        api.get('/dashboard/system-status')
      ]);

      setStats(statsRes.data);
      setRecentTrades(tradesRes.data);
      setRecentSignals(signalsRes.data);
      setPairPerformance(pairsRes.data);
      setMarketOverview(marketRes.data);
      setSystemStatus(statusRes.data);
    } catch (error) {
      console.error('Dashboard veri hatası:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);

    // Socket bağlantısı
    const socket = connectSocket();
    socket.on('tradeOpened', () => fetchData());
    socket.on('tradeClosed', () => fetchData());
    socket.on('newSignal', () => fetchData());

    return () => {
      clearInterval(interval);
      socket.off('tradeOpened');
      socket.off('tradeClosed');
      socket.off('newSignal');
    };
  }, [fetchData]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const formatUSD = (v) => '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPercent = (v) => (parseFloat(v) || 0).toFixed(2) + '%';

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Paper Trading simülasyon paneli — Canlı market verisi ile</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stagger-1 animate-slide-up">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>💰</div>
          <div className="stat-label">Paper Bakiye</div>
          <div className="stat-value mono">{formatUSD(stats?.balance)}</div>
          <div className={`stat-change ${stats?.totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {stats?.totalPnl >= 0 ? '▲' : '▼'} {formatUSD(Math.abs(stats?.totalPnl || 0))} ({formatPercent(stats?.totalPnlPercent)})
          </div>
        </div>

        <div className="stat-card stagger-2 animate-slide-up">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>📈</div>
          <div className="stat-label">Açık İşlemler</div>
          <div className="stat-value mono">{stats?.openTradeCount || 0}</div>
          <div className="stat-change" style={{ color: 'var(--text-secondary)' }}>
            Toplam: {stats?.closedTradeCount || 0} kapalı
          </div>
        </div>

        <div className="stat-card stagger-3 animate-slide-up">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>🎯</div>
          <div className="stat-label">Win Rate</div>
          <div className="stat-value mono">{formatPercent(stats?.winRate)}</div>
          <div className="stat-change" style={{ color: 'var(--text-secondary)' }}>
            R/R: {(stats?.avgRiskReward || 0).toFixed(2)}
          </div>
        </div>

        <div className="stat-card stagger-4 animate-slide-up">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>📅</div>
          <div className="stat-label">Günlük PnL</div>
          <div className={`stat-value mono ${stats?.dailyPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {formatUSD(stats?.dailyPnl)}
          </div>
          <div className="stat-change" style={{ color: 'var(--text-secondary)' }}>
            Haftalık: {formatUSD(stats?.weeklyPnl)}
          </div>
        </div>

        <div className="stat-card stagger-5 animate-slide-up">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>📊</div>
          <div className="stat-label">Aylık PnL</div>
          <div className={`stat-value mono ${stats?.monthlyPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {formatUSD(stats?.monthlyPnl)}
          </div>
          <div className="stat-change" style={{ color: 'var(--text-secondary)' }}>
            {stats?.totalSignals || 0} sinyal alındı
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Recent Trades */}
        <div className="glass-card">
          <div className="card-header">
            <h3>Son İşlemler</h3>
          </div>
          <div className="card-body">
            {recentTrades.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📭</div><p>Henüz işlem yok</p></div>
            ) : (
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Parite</th>
                    <th>Yön</th>
                    <th>Giriş</th>
                    <th>Durum</th>
                    <th>PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.slice(0, 6).map(trade => (
                    <tr key={trade.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>{trade.symbol}</td>
                      <td><span className={`badge badge-${trade.direction.toLowerCase()}`}>{trade.direction}</span></td>
                      <td className="mono">{parseFloat(trade.entry_price).toPrecision(6)}</td>
                      <td><span className={`badge badge-${trade.status.toLowerCase()}`}>{trade.status}</span></td>
                      <td className={`mono ${trade.pnl > 0 ? 'pnl-positive' : trade.pnl < 0 ? 'pnl-negative' : ''}`}>
                        {trade.pnl ? formatUSD(trade.pnl) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Signals */}
        <div className="glass-card">
          <div className="card-header">
            <h3>Son Sinyaller</h3>
          </div>
          <div className="card-body">
            {recentSignals.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📡</div><p>Henüz sinyal yok</p></div>
            ) : (
              <div className="signal-list">
                {recentSignals.slice(0, 6).map(signal => (
                  <div key={signal.id} className="signal-item">
                    <div className="signal-info">
                      <span className="mono" style={{ fontWeight: 600 }}>{signal.symbol}</span>
                      <span className={`badge badge-${signal.direction.toLowerCase()}`}>{signal.direction}</span>
                    </div>
                    <div className="signal-prices">
                      <span className="mono">Entry: {signal.entry_min}</span>
                      <span className="mono">SL: {signal.stop_loss}</span>
                    </div>
                    <div className="signal-meta">
                      <span className={`badge badge-${signal.status === 'FILLED' ? 'success' : signal.status === 'PENDING' ? 'warning' : 'closed'}`}>
                        {signal.status}
                      </span>
                      <span className="signal-time">{new Date(signal.created_at).toLocaleTimeString('tr-TR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Market Overview */}
        <div className="glass-card">
          <div className="card-header">
            <h3>Market Özeti</h3>
          </div>
          <div className="card-body">
            <div className="market-section">
              <h4 style={{ color: 'var(--color-success)', fontSize: '0.8rem', marginBottom: '8px' }}>🟢 EN ÇOK YÜKSELENLER</h4>
              {(marketOverview.topGainers || []).slice(0, 5).map((pair, i) => (
                <div key={i} className="market-row">
                  <span className="mono" style={{ fontWeight: 600 }}>{pair.symbol.replace('USDT', '')}</span>
                  <span className="mono">${pair.price < 1 ? pair.price.toPrecision(4) : pair.price.toFixed(2)}</span>
                  <span className="mono pnl-positive">+{pair.priceChangePercent.toFixed(2)}%</span>
                </div>
              ))}
            </div>
            <div className="market-divider"></div>
            <div className="market-section">
              <h4 style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '8px' }}>🔴 EN ÇOK DÜŞENLER</h4>
              {(marketOverview.topLosers || []).slice(0, 5).map((pair, i) => (
                <div key={i} className="market-row">
                  <span className="mono" style={{ fontWeight: 600 }}>{pair.symbol.replace('USDT', '')}</span>
                  <span className="mono">${pair.price < 1 ? pair.price.toPrecision(4) : pair.price.toFixed(2)}</span>
                  <span className="mono pnl-negative">{pair.priceChangePercent.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="glass-card">
          <div className="card-header">
            <h3>Sistem Durumu</h3>
          </div>
          <div className="card-body">
            <div className="status-grid">
              <div className="status-card">
                <div className="status-header">
                  <span className={`status-dot ${systemStatus?.telegram?.connected ? 'online' : 'offline'}`}></span>
                  <span>Telegram</span>
                </div>
                <span className="status-detail">
                  {systemStatus?.telegram?.connected ? 'Bağlı' : 'Bağlı değil'}
                  {systemStatus?.telegram?.messageCount > 0 && ` • ${systemStatus.telegram.messageCount} mesaj`}
                </span>
              </div>

              <div className="status-card">
                <div className="status-header">
                  <span className={`status-dot ${systemStatus?.binance?.connected ? 'online' : 'offline'}`}></span>
                  <span>Binance</span>
                </div>
                <span className="status-detail">
                  {systemStatus?.binance?.connected ? `${systemStatus.binance.symbolCount} sembol` : 'Bağlı değil'}
                </span>
              </div>

              <div className="status-card">
                <div className="status-header">
                  <span className={`status-dot ${systemStatus?.database?.connected ? 'online' : 'offline'}`}></span>
                  <span>Veritabanı</span>
                </div>
                <span className="status-detail">
                  {systemStatus?.database?.connected ? 'Aktif' : 'Bağlantı yok'}
                </span>
              </div>

              <div className="status-card">
                <div className="status-header">
                  <span className={`status-dot ${systemStatus?.strategy?.isRunning ? 'online' : 'offline'}`}></span>
                  <span>Strateji Motoru</span>
                </div>
                <span className="status-detail">
                  {systemStatus?.strategy?.isRunning ? `${systemStatus.strategy.activeSignals} aktif sinyal` : 'Çalışmıyor'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
