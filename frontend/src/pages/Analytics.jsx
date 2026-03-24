import React, { useState, useEffect } from 'react';
import api from '../api/client';
import './Analytics.css';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [symbolStats, setSymbolStats] = useState([]);
  const [dirStats, setDirStats] = useState([]);
  const [dailyPerf, setDailyPerf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumRes, symRes, dirRes, perfRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/symbols'),
          api.get('/analytics/direction'),
          api.get('/analytics/performance')
        ]);
        setSummary(sumRes.data);
        setSymbolStats(symRes.data);
        setDirStats(dirRes.data);
        setDailyPerf(perfRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const formatUSD = (v) => '$' + (parseFloat(v) || 0).toFixed(2);
  const s = summary || {};

  return (
    <div className="analytics-page animate-fade-in">
      <div className="page-header">
        <h1>Analitik & Raporlar</h1>
        <p>Detaylı performans analizi</p>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Toplam İşlem</div>
          <div className="stat-value mono">{s.total_trades || 0}</div>
          <div className="stat-change" style={{ color: 'var(--text-secondary)' }}>
            ✅ {s.total_wins || 0} Win | ❌ {s.total_losses || 0} Loss
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value mono pnl-positive">
            {s.total_trades > 0 ? ((s.total_wins / s.total_trades) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Toplam PnL</div>
          <div className={`stat-value mono ${parseFloat(s.total_pnl) >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {formatUSD(s.total_pnl)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ortalama PnL %</div>
          <div className={`stat-value mono ${parseFloat(s.avg_pnl_percent) >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {(parseFloat(s.avg_pnl_percent) || 0).toFixed(2)}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Max Drawdown</div>
          <div className="stat-value mono pnl-negative">{(s.maxDrawdown || 0).toFixed(2)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Risk/Reward</div>
          <div className="stat-value mono">{(parseFloat(s.avg_risk_reward) || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">En İyi Seri</div>
          <div className="stat-value mono pnl-positive">🔥 {s.bestStreak || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">En Kötü Seri</div>
          <div className="stat-value mono pnl-negative">💀 {s.worstStreak || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Toplam TP</div>
          <div className="stat-value mono pnl-positive">{s.total_tp || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Toplam SL</div>
          <div className="stat-value mono pnl-negative">{s.total_sl || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">En İyi Trade</div>
          <div className="stat-value mono pnl-positive">{formatUSD(s.best_trade)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">En Kötü Trade</div>
          <div className="stat-value mono pnl-negative">{formatUSD(s.worst_trade)}</div>
        </div>
      </div>

      {/* Direction Stats */}
      <div className="two-column" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 700 }}>📊 Long / Short Performansı</h3>
          {dirStats.length === 0 ? (
            <div className="empty-state"><p>Yeterli veri yok</p></div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr><th>Yön</th><th>İşlem</th><th>Win</th><th>Loss</th><th>Win Rate</th><th>PnL</th></tr>
              </thead>
              <tbody>
                {dirStats.map(d => (
                  <tr key={d.direction}>
                    <td><span className={`badge badge-${d.direction.toLowerCase()}`}>{d.direction}</span></td>
                    <td className="mono">{d.total_trades}</td>
                    <td className="mono pnl-positive">{d.wins}</td>
                    <td className="mono pnl-negative">{d.losses}</td>
                    <td className="mono">{d.win_rate}%</td>
                    <td className={`mono ${parseFloat(d.total_pnl) >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>{formatUSD(d.total_pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 700 }}>🎯 TP Kırılımı</h3>
          {(!s.tpBreakdown || s.tpBreakdown.length === 0) ? (
            <div className="empty-state"><p>Yeterli veri yok</p></div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr><th>Tip</th><th>Sayı</th><th>Toplam PnL</th></tr>
              </thead>
              <tbody>
                {(s.tpBreakdown || []).map(tp => (
                  <tr key={tp.result_type}>
                    <td className="mono" style={{ fontWeight: 600 }}>{tp.result_type}</td>
                    <td className="mono">{tp.count}</td>
                    <td className="mono pnl-positive">{formatUSD(tp.total_pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Symbol Performance */}
      <div className="glass-card">
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 700 }}>🪙 Sembol Bazlı Performans</h3>
        {symbolStats.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📊</div><p>Yeterli veri yok</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr><th>Sembol</th><th>İşlem</th><th>Win</th><th>Loss</th><th>PnL</th><th>Avg PnL %</th><th>En İyi</th><th>En Kötü</th><th>Ort. Süre</th></tr>
              </thead>
              <tbody>
                {symbolStats.map(sym => (
                  <tr key={sym.symbol}>
                    <td className="mono" style={{ fontWeight: 600 }}>{sym.symbol}</td>
                    <td className="mono">{sym.total_trades}</td>
                    <td className="mono pnl-positive">{sym.wins}</td>
                    <td className="mono pnl-negative">{sym.losses}</td>
                    <td className={`mono ${parseFloat(sym.total_pnl) >= 0 ? 'pnl-positive' : 'pnl-negative'}`} style={{ fontWeight: 600 }}>
                      {formatUSD(sym.total_pnl)}
                    </td>
                    <td className="mono">{(parseFloat(sym.avg_pnl_percent) || 0).toFixed(2)}%</td>
                    <td className="mono pnl-positive">{formatUSD(sym.best_trade)}</td>
                    <td className="mono pnl-negative">{formatUSD(sym.worst_trade)}</td>
                    <td className="mono">{Math.round(sym.avg_duration_min || 0)}dk</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
