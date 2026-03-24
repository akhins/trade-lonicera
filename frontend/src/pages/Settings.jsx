import React, { useState, useEffect } from 'react';
import api from '../api/client';
import './Settings.css';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updates = {};
      Object.entries(settings).forEach(([key, data]) => {
        updates[key] = data.value;
      });
      await api.put('/settings', updates);
      setMessage('✅ Ayarlar başarıyla kaydedildi');
    } catch (err) {
      setMessage('❌ Kaydetme hatası: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetBalance = async () => {
    if (!confirm('Bakiyeyi sıfırlamak istediğinize emin misiniz?')) return;
    try {
      const balanceValue = settings.paper_balance?.value || '10000';
      await api.put('/settings/reset-balance', { balance: parseFloat(balanceValue) });
      setMessage('✅ Bakiye sıfırlandı');
    } catch (err) {
      setMessage('❌ ' + err.message);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const settingGroups = [
    {
      title: '💰 Paper Trading',
      icon: '💰',
      items: [
        { key: 'paper_balance', label: 'Başlangıç Bakiyesi ($)', type: 'number' },
        { key: 'risk_percent', label: 'Risk Yüzdesi (%)', type: 'number' },
        { key: 'commission_rate', label: 'Komisyon Oranı (%)', type: 'number' },
        { key: 'slippage', label: 'Slippage (%)', type: 'number' },
        { key: 'max_open_trades', label: 'Max Açık Trade', type: 'number' },
        { key: 'default_leverage', label: 'Varsayılan Kaldıraç', type: 'number' }
      ]
    },
    {
      title: '📡 Entegrasyonlar',
      icon: '📡',
      items: [
        { key: 'telegram_enabled', label: 'Telegram Aktif', type: 'toggle' },
        { key: 'binance_enabled', label: 'Binance Aktif', type: 'toggle' },
        { key: 'max_wait_minutes', label: 'Signal Bekleme Süresi (dk)', type: 'number' }
      ]
    },
    {
      title: '🎨 Görünüm',
      icon: '🎨',
      items: [
        { key: 'theme', label: 'Tema', type: 'select', options: ['dark', 'light'] }
      ]
    }
  ];

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Ayarlar</h1>
          <p>Sistem konfigürasyonu ve tercihler</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-danger btn-sm" onClick={handleResetBalance}>🔄 Bakiye Sıfırla</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: 'var(--spacing-lg)',
          background: message.includes('✅') ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          border: `1px solid ${message.includes('✅') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: message.includes('✅') ? 'var(--color-success)' : 'var(--color-danger)',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}

      <div className="settings-groups">
        {settingGroups.map(group => (
          <div key={group.title} className="glass-card settings-group">
            <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1rem', fontWeight: 700 }}>{group.title}</h3>
            <div className="settings-items">
              {group.items.map(item => (
                <div key={item.key} className="setting-row">
                  <div className="setting-info">
                    <label>{item.label}</label>
                    {settings[item.key]?.description && (
                      <span className="setting-desc">{settings[item.key].description}</span>
                    )}
                  </div>
                  <div className="setting-control">
                    {item.type === 'toggle' ? (
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings[item.key]?.value === '1'}
                          onChange={(e) => updateSetting(item.key, e.target.checked ? '1' : '0')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    ) : item.type === 'select' ? (
                      <select
                        className="input-field"
                        value={settings[item.key]?.value || ''}
                        onChange={(e) => updateSetting(item.key, e.target.value)}
                      >
                        {item.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={item.type}
                        className="input-field"
                        value={settings[item.key]?.value || ''}
                        onChange={(e) => updateSetting(item.key, e.target.value)}
                        style={{ width: '150px', textAlign: 'right' }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Environment Info */}
      <div className="glass-card" style={{ marginTop: 'var(--spacing-lg)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 700 }}>ℹ️ Ortam Bilgileri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Telegram Bot Token: </span>
            <span className="mono">••••••••• (.env dosyasından)</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Binance Data: </span>
            <span className="mono">fapi.binance.com (Public)</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Database: </span>
            <span className="mono">MariaDB (.env dosyasından)</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Trade Modu: </span>
            <span className="badge badge-warning">PAPER ONLY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
