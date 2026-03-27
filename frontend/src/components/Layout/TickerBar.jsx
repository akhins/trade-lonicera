import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import './TickerBar.css';

export default function TickerBar() {
  const [movers, setMovers] = useState([]);

  useEffect(() => {
    const fetchMovers = async () => {
      try {
        const res = await api.get('/dashboard/market-overview');
        // Combine gainers and losers for a continuous scroll
        const all = [...(res.data.topGainers || []), ...(res.data.topLosers || [])];
        setMovers(all);
      } catch (err) {
        console.error('Ticker fetch error:', err);
      }
    };

    fetchMovers();
    const interval = setInterval(fetchMovers, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  if (movers.length === 0) return null;

  return (
    <div className="ticker-wrapper">
      <div className="ticker-label">
        <Activity size={14} />
        <span>LIVE MARKET</span>
      </div>
      <div className="ticker-container">
        <div className="ticker-scroll">
          {movers.map((m, i) => (
            <div key={`${m.symbol}-${i}`} className="ticker-item">
              <span className="ticker-symbol">{m.symbol.replace('USDT', '')}</span>
              <span className="ticker-price">${m.price < 1 ? m.price.toPrecision(4) : m.price.toLocaleString()}</span>
              <span className={`ticker-change ${m.priceChangePercent >= 0 ? 'up' : 'down'}`}>
                {m.priceChangePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(m.priceChangePercent).toFixed(2)}%
              </span>
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {movers.map((m, i) => (
            <div key={`${m.symbol}-dup-${i}`} className="ticker-item">
              <span className="ticker-symbol">{m.symbol.replace('USDT', '')}</span>
              <span className="ticker-price">${m.price < 1 ? m.price.toPrecision(4) : m.price.toLocaleString()}</span>
              <span className={`ticker-change ${m.priceChangePercent >= 0 ? 'up' : 'down'}`}>
                {m.priceChangePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(m.priceChangePercent).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
