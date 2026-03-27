import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Zap, 
  Radio, 
  TrendingUp, 
  History, 
  BarChart3, 
  Settings as SettingsIcon, 
  Terminal,
  Brain,
  LogOut
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { path: '/signals', icon: <Radio size={20} />, label: 'Sinyaller' },
  { path: '/open-trades', icon: <TrendingUp size={20} />, label: 'Açık İşlemler' },
  { path: '/trade-history', icon: <History size={20} />, label: 'İşlem Geçmişi' },
  { path: '/analytics', icon: <BarChart3 size={20} />, label: 'Analitik' },
  { path: '/strategies', icon: <Brain size={20} />, label: 'Stratejiler' },
  { path: '/settings', icon: <SettingsIcon size={20} />, label: 'Ayarlar' },
  { path: '/system-logs', icon: <Terminal size={20} />, label: 'Sistem Logları' }
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
          <span className="nav-icon"><LogOut size={20} /></span>
          <span className="nav-label">Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
}
