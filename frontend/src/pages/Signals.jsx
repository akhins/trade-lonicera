import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function Signals() {
  const [signals, setSignals] = useState([]);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignals();
  }, [filter]);

  const fetchSignals = async () => {
    try {
      const params = filter ? { status: filter } : {};
      const res = await api.get('/signals', { params });
      setSignals(res.data.signals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSignal = async () => {
    if (!testText.trim()) return;
    try {
      const res = await api.post('/signals/test', { text: testText });
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ error: err.message });
    }
  };

  const handleTestAndSave = async () => {
    if (!testText.trim()) return;
    try {
      await api.post('/signals/test-and-save', { text: testText });
      setTestResult({ success: true, message: 'Sinyal kaydedildi ve işleme alındı' });
      fetchSignals();
    } catch (err) {
      setTestResult({ error: err.message });
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Sinyaller</h1>
        <p>Telegram sinyallerini görüntüle, test et ve yönet</p>
      </div>

      {/* Signal Test Panel */}
      <div className="glass-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 700 }}>🧪 Sinyal Test Paneli</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
          <div>
            <div className="input-group">
              <label>Sinyal Metni</label>
              <textarea
                className="input-field"
                placeholder="🔵 LONG BTCUSDT&#10;Entry: 42000 - 42500&#10;SL: 41000&#10;TP1: 43000&#10;TP2: 44000"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={6}
                style={{ minHeight: '150px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
              <button className="btn btn-secondary" onClick={handleTestSignal}>🔍 Test Et</button>
              <button className="btn btn-primary" onClick={handleTestAndSave}>📥 Test Et & Kaydet</button>
            </div>
          </div>
          <div>
            {testResult && (
              <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>Parse Sonucu</h4>
                {testResult.error ? (
                  <div className="badge badge-danger">Hata: {testResult.error}</div>
                ) : testResult.success ? (
                  <div className="badge badge-success">{testResult.message}</div>
                ) : (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.8 }}>
                    <div>Geçerli: <span className={testResult.isValid ? 'pnl-positive' : 'pnl-negative'}>{testResult.isValid ? '✅ Evet' : '❌ Hayır'}</span></div>
                    {testResult.parsed && (
                      <>
                        <div>Sembol: <strong>{testResult.parsed.symbol}</strong></div>
                        <div>Yön: <span className={`badge badge-${testResult.parsed.direction?.toLowerCase()}`}>{testResult.parsed.direction}</span></div>
                        <div>Entry: {testResult.parsed.entryMin} - {testResult.parsed.entryMax}</div>
                        <div>Stop Loss: {testResult.parsed.stopLoss}</div>
                        <div>Take Profits: {testResult.parsed.takeProfits?.join(' / ') || '—'}</div>
                        <div>Parser: {testResult.parserUsed}</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signal Filters */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        {['', 'PENDING', 'ACTIVE', 'FILLED', 'EXPIRED', 'INVALID'].map(status => (
          <button
            key={status}
            className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(status)}
          >
            {status || 'Tümü'}
          </button>
        ))}
      </div>

      {/* Signals Table */}
      <div className="glass-card">
        {signals.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📡</div><p>Sinyal bulunamadı</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sembol</th>
                  <th>Yön</th>
                  <th>Entry</th>
                  <th>Stop Loss</th>
                  <th>TP1</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {signals.map(signal => (
                  <tr key={signal.id}>
                    <td className="mono">{signal.id}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{signal.symbol}</td>
                    <td><span className={`badge badge-${signal.direction.toLowerCase()}`}>{signal.direction}</span></td>
                    <td className="mono">{signal.entry_min} — {signal.entry_max}</td>
                    <td className="mono">{signal.stop_loss}</td>
                    <td className="mono">{signal.take_profit_1 || '—'}</td>
                    <td>
                      <span className={`badge ${
                        signal.status === 'FILLED' ? 'badge-success' :
                        signal.status === 'PENDING' ? 'badge-warning' :
                        signal.status === 'INVALID' ? 'badge-danger' : 'badge-closed'
                      }`}>{signal.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(signal.created_at).toLocaleString('tr-TR')}
                    </td>
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
