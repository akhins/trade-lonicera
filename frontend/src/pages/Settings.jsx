import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  Save, RefreshCcw, Wallet, Globe, Palette, Info, 
  CheckCircle, AlertCircle, ShieldCheck, Cpu 
} from 'lucide-react';
import { motion } from 'framer-motion';
import './Settings.css';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text: '' }

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
    setStatus(null);
    try {
      const updates = {};
      Object.entries(settings).forEach(([key, data]) => {
        updates[key] = data.value;
      });
      await api.put('/settings', updates);
      setStatus({ type: 'success', text: 'Ayarlar başarıyla kaydedildi' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', text: 'Kaydetme hatası: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleResetBalance = async () => {
    if (!confirm('Bakiyeyi sıfırlamak istediğinize emin misiniz?')) return;
    try {
      const balanceValue = settings.paper_balance?.value || '10000';
      await api.put('/settings/reset-balance', { balance: parseFloat(balanceValue) });
      setStatus({ type: 'success', text: 'Paper bakiye başarıyla sıfırlandı' });
      await fetchSettings();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
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
      title: 'Paper Trading',
      icon: <Wallet size={20} />,
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
      title: 'Entegrasyonlar',
      icon: <Globe size={20} />,
      items: [
        { key: 'telegram_enabled', label: 'Telegram Aktif', type: 'toggle' },
        { key: 'binance_enabled', label: 'Binance Aktif', type: 'toggle' },
        { key: 'max_wait_minutes', label: 'Signal Bekleme Süresi (dk)', type: 'number' }
      ]
    }
  ];

  return (
    <div className="settings-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Ayarlar</h1>
          <p>Sistem konfigürasyonu ve Paper Trading parametreleri</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-danger" onClick={handleResetBalance} style={{ gap: '8px' }}>
            <RefreshCcw size={18} /> Bakiye Sıfırla
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: '8px', minWidth: '140px' }}>
            {saving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1.5rem',
            background: status.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${status.type === 'success' ? 'var(--color-success-glow)' : 'var(--color-danger-glow)'}`,
            color: status.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          {status.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
          {status.text}
        </motion.div>
      )}

      <div className="settings-groups">
        {settingGroups.map((group, idx) => (
          <motion.div 
            key={group.title} 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card"
          >
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--accent-primary)' }}>{group.icon}</span>
              {group.title}
            </h3>
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
                    ) : (
                      <input
                        type={item.type}
                        className="input-field"
                        value={settings[item.key]?.value || ''}
                        onChange={(e) => updateSetting(item.key, e.target.value)}
                        style={{ width: '120px', textAlign: 'right' }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
        >
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent-primary)' }}><Info size={20} /></span>
            Sistem Bilgileri
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            <div className="setting-row" style={{ background: 'transparent', padding: '0.5rem 0' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>İşlem Modu</span>
              <span className="badge badge-warning" style={{ fontWeight: 700 }}>PAPER TRADING ONLY</span>
            </div>
            <div className="setting-row" style={{ background: 'transparent', padding: '0.5rem 0' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>API Bağlantısı</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span className="status-dot online"></span>
                 <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Binance Futures</span>
              </div>
            </div>
            <div className="setting-row" style={{ background: 'transparent', padding: '0.5rem 0' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Sürüm</span>
              <span className="mono" style={{ fontSize: '0.9rem' }}>v2.1.0-modern</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
