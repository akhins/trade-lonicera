import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { connectSocket } from '../api/client';

export default function OpenTrades() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    try {
      const res = await api.get('/trades/open');
      setTrades(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    const socket = connectSocket();
    socket.on('tradeOpened', fetchTrades);
    socket.on('tradeClosed', fetchTrades);
    socket.on('tradeUpdate', (data) => {
      setTrades(prev => prev.map(t => 
        t.id === data.tradeId ? { ...t, current_price: data.currentPrice, unrealized_pnl: data.pnl, unrealized_pnl_percent: data.pnlPercent } : t
      ));
    });
    return () => {
      clearInterval(interval);
      socket.off('tradeOpened');
      socket.off('tradeClosed');
      socket.off('tradeUpdate');
    };
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const formatUSD = (v) => '$' + (parseFloat(v) || 0).toFixed(2);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Açık İşlemler</h1>
        <p>{trades.length} aktif paper trade</p>
      </div>

      {trades.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state"><div className="empty-icon">📈</div><p>Açık işlem bulunmuyor</p></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          {trades.map(trade => (
            <div key={trade.id} className="glass-card" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parite</div>
                  <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{trade.symbol}</div>
                  <span className={`badge badge-${trade.direction.toLowerCase()}`} style={{ marginTop: 4 }}>{trade.direction}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Giriş Fiyatı</div>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 600 }}>{parseFloat(trade.entry_price).toPrecision(6)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Güncel Fiyat</div>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 600 }}>
                    {trade.current_price ? parseFloat(trade.current_price).toPrecision(6) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Pozisyon</div>
                  <div className="mono" style={{ fontSize: '0.9rem' }}>{formatUSD(trade.position_size)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Risk: {formatUSD(trade.risk_amount)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Gerçekleşmemiş PnL</div>
                  <div className={`mono ${trade.unrealized_pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`} 
                       style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    {formatUSD(trade.unrealized_pnl)}
                  </div>
                  <div className={`mono ${trade.unrealized_pnl_percent >= 0 ? 'pnl-positive' : 'pnl-negative'}`}
                       style={{ fontSize: '0.85rem' }}>
                    {(trade.unrealized_pnl_percent || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
              {/* TP/SL Level Bar */}
              <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-lg)', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-danger)' }}>SL: {parseFloat(trade.stop_loss).toPrecision(6)}</span>
                {trade.take_profit_1 && <span style={{ color: 'var(--color-success)' }}>TP1: {parseFloat(trade.take_profit_1).toPrecision(6)}</span>}
                {trade.take_profit_2 && <span style={{ color: 'var(--color-success)' }}>TP2: {parseFloat(trade.take_profit_2).toPrecision(6)}</span>}
                {trade.take_profit_3 && <span style={{ color: 'var(--color-success)' }}>TP3: {parseFloat(trade.take_profit_3).toPrecision(6)}</span>}
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  Açılış: {new Date(trade.opened_at).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
