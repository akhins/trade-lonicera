import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import './Header.css';

export default function Header() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/dashboard/system-status');
        setStatus(res.data);
      } catch (e) {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="top-header">
      <div className="header-left">
        <div className="live-indicator">
          <span className="live-dot"></span>
          <span>CANLI</span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-status-items">
          <div className="header-status-item" title="Telegram">
            <span className={`status-dot ${status?.telegram?.connected ? 'online' : 'offline'}`}></span>
            <span>TG</span>
          </div>
          <div className="header-status-item" title="Binance">
            <span className={`status-dot ${status?.binance?.connected ? 'online' : 'offline'}`}></span>
            <span>BN</span>
          </div>
          <div className="header-status-item" title="Database">
            <span className={`status-dot ${status?.database?.connected ? 'online' : 'offline'}`}></span>
            <span>DB</span>
          </div>
        </div>

        <div className="header-divider"></div>

        <div className="header-user">
          <div className="user-avatar">
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <span className="user-name">{user?.username || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
