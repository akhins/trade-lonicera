import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [levelFilter, setLevelFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [levelFilter]);

  const fetchLogs = async () => {
    try {
      const params = levelFilter ? { level: levelFilter, limit: 100 } : { limit: 100 };
      const res = await api.get('/system/logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('7 günden eski logları silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete('/system/logs');
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const levelColors = {
    DEBUG: '#64748b',
    INFO: '#3b82f6',
    WARN: '#f59e0b',
    ERROR: '#ef4444',
    FATAL: '#dc2626'
  };

  const levelEmojis = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    FATAL: '💀'
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Sistem Logları</h1>
          <p>Toplam {total} log kaydı</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>🔄 Yenile</button>
          <button className="btn btn-danger btn-sm" onClick={handleCleanup}>🗑️ Eski Logları Temizle</button>
        </div>
      </div>

      {/* Level Filters */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        {['', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].map(level => (
          <button
            key={level}
            className={`btn btn-sm ${levelFilter === level ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setLevelFilter(level)}
          >
            {level ? `${levelEmojis[level]} ${level}` : 'Tümü'}
          </button>
        ))}
      </div>

      <div className="glass-card">
        {logs.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔧</div><p>Log bulunamadı</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '70vh', overflowY: 'auto' }}>
            {logs.map(log => (
              <div key={log.id} style={{
                display: 'grid',
                gridTemplateColumns: '80px 120px 1fr',
                gap: 'var(--spacing-md)',
                padding: '10px 14px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${levelColors[log.level] || '#64748b'}`,
                fontSize: '0.85rem',
                alignItems: 'center'
              }}>
                <span style={{
                  color: levelColors[log.level],
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {levelEmojis[log.level]} {log.level}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  [{log.module}]
                </span>
                <div>
                  <span>{log.message}</span>
                  {log.details && (
                    <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                      {log.details.length > 200 ? log.details.substring(0, 200) + '...' : log.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
