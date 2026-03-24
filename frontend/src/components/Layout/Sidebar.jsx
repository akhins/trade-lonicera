import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/signals', icon: '📡', label: 'Sinyaller' },
  { path: '/open-trades', icon: '📈', label: 'Açık İşlemler' },
  { path: '/trade-history', icon: '📋', label: 'İşlem Geçmişi' },
  { path: '/analytics', icon: '📉', label: 'Analitik' },
  { path: '/settings', icon: '⚙️', label: 'Ayarlar' },
  { path: '/system-logs', icon: '🔧', label: 'Sistem Logları' }
];

export default function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">⚡</div>
        <div className="brand-text">
          <h1>SametAbi</h1>
          <span>Trade</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">ANA MENÜ</div>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.path === location.pathname && <div className="nav-indicator" />}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-badge">
          <span className="status-dot online"></span>
          <span>Paper Trading</span>
        </div>
        <button className="nav-item logout-btn" onClick={logout}>
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
}
