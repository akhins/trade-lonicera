import React, { useState, useEffect, useCallback } from 'react';
import api, { connectSocket } from '../api/client';
import PortfolioChart from '../components/Dashboard/PortfolioChart';
import MarketSentiment from '../components/Dashboard/MarketSentiment';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Target, Clock, Activity, 
  ArrowUpRight, ArrowDownRight, Layers, BarChart3, Shield, Info, Brain, History, Terminal
} from 'lucide-react';
import { motion } from 'framer-motion';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [recentSignals, setRecentSignals] = useState([]);
  const [pairPerformance, setPairPerformance] = useState({ topPairs: [], worstPairs: [] });
  const [marketOverview, setMarketOverview] = useState({ topGainers: [], topLosers: [] });
  const [systemStatus, setSystemStatus] = useState(null);
  const [pnlHistory, setPnlHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tradesRes, signalsRes, pairsRes, marketRes, statusRes, pnlRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-trades'),
        api.get('/dashboard/recent-signals'),
        api.get('/dashboard/top-pairs'),
        api.get('/dashboard/market-overview'),
        api.get('/dashboard/system-status'),
        api.get('/dashboard/pnl-chart')
      ]);

      setStats(statsRes.data);
      setRecentTrades(tradesRes.data);
      setRecentSignals(signalsRes.data);
      setPairPerformance(pairsRes.data);
      setMarketOverview(marketRes.data);
      setSystemStatus(statusRes.data);
      setPnlHistory(pnlRes.data || []);
      setError(null);
    } catch (error) {
      console.error('Dashboard veri hatası:', error);
      setError('Veriler yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);

    // Request notification permission on mount
    requestNotificationPermission();

    const socket = connectSocket();
    
    socket.on('tradeOpened', (data) => {
      fetchData();
      sendNotification('İşlem Açıldı', `${data?.symbol} için ${data?.direction} yönünde işlem açıldı.`);
    });
    
    socket.on('tradeClosed', (data) => {
      fetchData();
      const pnl = data?.pnl ? ` (PnL: $${parseFloat(data.pnl).toFixed(2)})` : '';
      sendNotification('İşlem Kapandı', `${data?.symbol} işlemi kapandı.${pnl}`);
    });
    
    socket.on('newSignal', (data) => {
      fetchData();
      sendNotification('Yeni Sinyal!', `${data?.symbol} için yeni bir ${data?.direction} sinyali alındı.`);
    });

    return () => {
      clearInterval(interval);
      socket.off('tradeOpened');
      socket.off('tradeClosed');
      socket.off('newSignal');
    };
  }, [fetchData]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (error) return <div className="error-message" style={{ color: 'var(--color-danger)', padding: '2rem' }}><h3>Hata:</h3><p>{error}</p></div>;

  const formatUSD = (v) => '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPercent = (v) => (parseFloat(v) || 0).toFixed(2) + '%';

  const chartData = pnlHistory.map(h => ({
    time: new Date(h.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    balance: parseFloat(h.balance)
  }));

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Paper Trading simülasyon paneli — Canlı market verisi ile</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}><Activity size={24} /></div>
          <div className="stat-label">Bakiye</div>
          <div className="stat-value">{formatUSD(stats?.balance)}</div>
          <div className={`stat-footer ${stats?.totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {stats?.totalPnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {formatPercent(stats?.totalPnlPercent)}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}><Layers size={24} /></div>
          <div className="stat-label">Açık İşlemler</div>
          <div className="stat-value">{stats?.openTradeCount || 0}</div>
          <div className="stat-footer" style={{ color: 'var(--text-tertiary)' }}>
            Toplam: {stats?.closedTradeCount || 0} kapalı
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><Target size={24} /></div>
          <div className="stat-label">Win Rate</div>
          <div className="stat-value">{formatPercent(stats?.winRate)}</div>
          <div className="stat-footer" style={{ color: 'var(--text-tertiary)' }}>
            R/R: {(stats?.avgRiskReward || 0).toFixed(2)}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><TrendingUp size={24} /></div>
          <div className="stat-label">Günlük PnL</div>
          <div className={`stat-value ${stats?.dailyPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>{formatUSD(stats?.dailyPnl)}</div>
          <div className="stat-footer" style={{ color: 'var(--text-tertiary)' }}>
            Haftalık: {formatUSD(stats?.weeklyPnl)}
          </div>
        </motion.div>
      </div>

      <div className="dashboard-grid">
        <div className="grid-left">
          {/* PnL Chart */}
          <div className="glass-card">
            <div className="card-header">
              <h3><BarChart3 size={18} className="card-header-icon" /> Performans Grafiği</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--accent-primary)' }}
                  />
                  <Area type="monotone" dataKey="balance" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="glass-card">
            <div className="card-header">
              <h3><History size={18} className="card-header-icon" /> Son İşlemler</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Parite</th>
                    <th>Yön</th>
                    <th>Giriş</th>
                    <th>PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.slice(0, 5).map(trade => (
                    <tr key={trade.id}>
                      <td className="mono" style={{ fontWeight: 700 }}>{trade.symbol}</td>
                      <td><span className={`badge badge-${trade.direction.toLowerCase()}`}>{trade.direction}</span></td>
                      <td className="mono">{parseFloat(trade.entry_price).toPrecision(6)}</td>
                      <td className={`mono ${trade.pnl > 0 ? 'pnl-positive' : trade.pnl < 0 ? 'pnl-negative' : ''}`}>
                        {trade.pnl ? formatUSD(trade.pnl) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid-right">
          {/* AI Market Sentiment */}
          <div className="glass-card">
            <MarketSentiment />
          </div>

          {/* Portfolio Distribution */}
          <div className="glass-card">
            <div className="card-header">
              <h3><Shield size={18} className="card-header-icon" /> Portföy Dağılımı</h3>
            </div>
            <PortfolioChart data={recentTrades.filter(t => t.status === 'OPEN')} />
          </div>

          {/* Market Sentiment / Info */}
          <div className="glass-card">
            <div className="card-header">
              <h3><Info size={18} className="card-header-icon" /> Market Özeti</h3>
            </div>
            <div className="market-overview-compact">
              {(marketOverview.topGainers || []).slice(0, 4).map((pair, i) => (
                <div key={i} className="market-row">
                  <div className="market-info">
                    <span className="market-symbol">{pair.symbol.replace('USDT', '')}</span>
                  </div>
                  <span className="mono pnl-positive">+{pair.priceChangePercent.toFixed(2)}%</span>
                </div>
              ))}
              {(marketOverview.topLosers || []).slice(0, 4).map((pair, i) => (
                <div key={i} className="market-row">
                  <div className="market-info">
                    <span className="market-symbol">{pair.symbol.replace('USDT', '')}</span>
                  </div>
                  <span className="mono pnl-negative">{pair.priceChangePercent.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="glass-card">
            <div className="card-header">
              <h3><Terminal size={18} className="card-header-icon" /> Sistem Sağlığı</h3>
            </div>
            <div className="status-mini-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
               <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>Binance</div>
                  <div style={{ fontWeight: 700, color: systemStatus?.binance?.connected ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {systemStatus?.binance?.connected ? 'AKTİF' : 'ÇEVRİMDIŞI'}
                  </div>
               </div>
               <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>Veritabanı</div>
                  <div style={{ fontWeight: 700, color: systemStatus?.database?.connected ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {systemStatus?.database?.connected ? 'BAĞLI' : 'KOPUK'}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
