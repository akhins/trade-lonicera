import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function TradeHistory() {
  const [trades, setTrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, [filter]);

  const fetchTrades = async () => {
    try {
      const params = filter ? { result_type: filter } : {};
      const res = await api.get('/trades/history', { params });
      setTrades(res.data.trades || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/analytics/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'trade_history.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const formatUSD = (v) => {
    const val = parseFloat(v) || 0;
    return (val >= 0 ? '+$' : '-$') + Math.abs(val).toFixed(2);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>İşlem Geçmişi</h1>
          <p>Toplam {total} kapalı işlem</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExport}>📥 CSV İndir</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        {['', 'TP1', 'TP2', 'TP3', 'TP4', 'SL', 'BREAKEVEN'].map(rt => (
          <button
            key={rt}
            className={`btn btn-sm ${filter === rt ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(rt)}
          >
            {rt || 'Tümü'}
          </button>
        ))}
      </div>

      <div className="glass-card">
        {trades.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><p>İşlem geçmişi bulunamadı</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Sembol</th>
                  <th>Yön</th>
                  <th>Giriş</th>
                  <th>Çıkış</th>
                  <th>Pozisyon</th>
                  <th>Sonuç</th>
                  <th>PnL</th>
                  <th>PnL %</th>
                  <th>Süre</th>
                  <th>Kapanış</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => {
                  const duration = trade.closed_at && trade.opened_at ?
                    Math.round((new Date(trade.closed_at) - new Date(trade.opened_at)) / 60000) : 0;
                  return (
                    <tr key={trade.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>{trade.symbol}</td>
                      <td><span className={`badge badge-${trade.direction.toLowerCase()}`}>{trade.direction}</span></td>
                      <td className="mono">{parseFloat(trade.entry_price).toPrecision(6)}</td>
                      <td className="mono">{trade.exit_price ? parseFloat(trade.exit_price).toPrecision(6) : '—'}</td>
                      <td className="mono">${parseFloat(trade.position_size || 0).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${trade.result_type?.startsWith('TP') ? 'badge-success' : 'badge-danger'}`}>
                          {trade.result_type || '—'}
                        </span>
                      </td>
                      <td className={`mono ${parseFloat(trade.pnl) >= 0 ? 'pnl-positive' : 'pnl-negative'}`} style={{ fontWeight: 600 }}>
                        {formatUSD(trade.pnl)}
                      </td>
                      <td className={`mono ${parseFloat(trade.pnl_percent) >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                        {(parseFloat(trade.pnl_percent) || 0).toFixed(2)}%
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {duration > 60 ? `${Math.floor(duration/60)}s ${duration%60}dk` : `${duration}dk`}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {trade.closed_at ? new Date(trade.closed_at).toLocaleString('tr-TR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
