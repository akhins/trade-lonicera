import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { connectSocket } from '../api/client';

export default function OpenTrades() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symbolInput, setSymbolInput] = useState('RIVERUSDT');
  const [manualLoading, setManualLoading] = useState(false);

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

  const handleManualTrade = async (direction) => {
    setManualLoading(true);
    try {
      const res = await api.post('/trades/manual', {
        symbol: symbolInput,
        direction,
        leverage: 5
      });
      alert(`✅ İşlem açıldı!\n${JSON.stringify(res.data.trade, null, 2)}`);
      setSymbolInput('RIVERUSDT');
      fetchTrades();
    } catch (err) {
      alert(`❌ Hata: ${err.response?.data?.error || err.message}`);
    } finally {
      setManualLoading(false);
    }
  };

  const handleCloseAll = async () => {
    if (trades.length === 0) return;
    
    if (!window.confirm(`⚠️ DİKKAT: ${trades.length} adet açık işlemin tamamı piyasa fiyatından kapatılacak. Onaylıyor musunuz?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.post('/trades/close-all');
      alert('✅ Tüm işlemler başarıyla kapatıldı.');
      fetchTrades();
    } catch (err) {
      alert(`❌ Hata: ${err.response?.data?.error || err.message}`);
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Açık İşlemler</h1>
          <p>{trades.length} aktif paper trade</p>
        </div>
        {trades.length > 0 && (
          <button 
            onClick={handleCloseAll}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 68, 68, 0.15)',
              color: '#ff4444',
              border: '1px solid rgba(255, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.25)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.15)'}
          >
            🛑 Tüm İşlemleri Kapat
          </button>
        )}
      </div>

      {/* Manual Trade Form */}
      <div className="glass-card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>🧪 Manual Test İşlem</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 'var(--spacing-md)', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Parite</label>
            <input 
              type="text" 
              value={symbolInput} 
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              placeholder="RIVERUSDT"
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem'
              }}
              disabled={manualLoading}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Parametre</label>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              5x Kaldıraç • $250 Notional
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Risk/Reward</label>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              1:3 (SL 2% / TP 6%)
            </div>
          </div>
          <button 
            onClick={() => handleManualTrade('LONG')}
            disabled={manualLoading}
            style={{
              padding: '8px 16px',
              background: 'var(--color-success)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: manualLoading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              opacity: manualLoading ? 0.5 : 1
            }}
          >
            {manualLoading ? '...' : '📈 LONG'}
          </button>
          <button 
            onClick={() => handleManualTrade('SHORT')}
            disabled={manualLoading}
            style={{
              padding: '8px 16px',
              background: 'var(--color-danger)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: manualLoading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              opacity: manualLoading ? 0.5 : 1
            }}
          >
            {manualLoading ? '...' : '📉 SHORT'}
          </button>
        </div>
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Büyüklük (Notional)</div>
                  <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatUSD(trade.position_size)}</div>
                  <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{parseFloat(trade.units).toFixed(2)} {trade.symbol.replace('USDT', '')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Risk (USD)</div>
                  <div className="mono" style={{ fontSize: '0.9rem', color: 'var(--color-danger)' }}>{formatUSD(trade.risk_amount)}</div>
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
