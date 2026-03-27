import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Target, BarChart3, PieChart as PieIcon, 
  Layers, Clock, Zap, ArrowUpRight, ArrowDownRight, Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import './Analytics.css';

const COLORS = ['#58a6ff', '#bc8cff', '#3fb950', '#f85149', '#d29922', '#388bfd'];

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [symbolStats, setSymbolStats] = useState([]);
  const [dirStats, setDirStats] = useState([]);
  const [dailyPerf, setDailyPerf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumRes, symRes, dirRes, perfRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/symbols'),
          api.get('/analytics/direction'),
          api.get('/analytics/performance')
        ]);
        setSummary(sumRes.data);
        setSymbolStats(symRes.data);
        setDirStats(dirRes.data);
        setDailyPerf(perfRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const formatUSD = (v) => '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const formatPercent = (v) => (parseFloat(v) || 0).toFixed(1) + '%';
  const s = summary || {};

  // Chart Data preparation
  const winLossData = [
    { name: 'Wins', value: s.total_wins || 0 },
    { name: 'Losses', value: s.total_losses || 0 }
  ];

  const symbolChartData = symbolStats.slice(0, 8).map(sym => ({
    name: sym.symbol.replace('USDT', ''),
    pnl: parseFloat(sym.total_pnl)
  }));

  const perfChartData = dailyPerf.map(p => ({
    date: new Date(p.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    pnl: parseFloat(p.daily_pnl)
  }));

  // Advanced Metrics
  const profitFactor = s.total_losses_val !== 0 ? (Math.abs(s.total_wins_val || 0) / Math.abs(s.total_losses_val || 1)).toFixed(2) : '∞';
  const expectancy = s.total_trades > 0 ? (parseFloat(s.total_pnl) / s.total_trades).toFixed(2) : '0.00';

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>Performans Analitiği</h1>
        <p>Hesap büyümesi ve trading verimliliği raporu</p>
      </div>

      {/* Hero Metrics */}
      <div className="metrics-summary">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="metric-item">
          <div className="metric-label">Toplam PnL</div>
          <div className={`metric-value ${parseFloat(s.total_pnl) >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {formatUSD(s.total_pnl)}
          </div>
          <div className="metric-sub" style={{ color: 'var(--text-tertiary)' }}>
            Growth: {formatPercent(s.totalPnlPercent)}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="metric-item">
          <div className="metric-label">Win Rate</div>
          <div className="metric-value pnl-positive">
            {s.total_trades > 0 ? ((s.total_wins / s.total_trades) * 100).toFixed(1) : 0}%
          </div>
          <div className="metric-sub" style={{ color: 'var(--text-tertiary)' }}>
            {s.total_wins} Win / {s.total_losses} Loss
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="metric-item">
          <div className="metric-label">Profit Factor</div>
          <div className="metric-value" style={{ color: parseFloat(profitFactor) > 1 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {profitFactor}
          </div>
          <div className="metric-sub" style={{ color: 'var(--text-tertiary)' }}>
            Efficiency Ratio
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="metric-item">
          <div className="metric-label">Expectancy</div>
          <div className="metric-value" style={{ color: parseFloat(expectancy) > 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            ${expectancy}
          </div>
          <div className="metric-sub" style={{ color: 'var(--text-tertiary)' }}>
            Per Trade Avg
          </div>
        </motion.div>
      </div>

      <div className="analytics-grid">
        {/* Cumulative PnL Chart */}
        <div className="chart-card">
          <div className="chart-title"><TrendingUp size={18} /> Kümülatif Performans</div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perfChartData}>
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide={true} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="pnl" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#pnlGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Pie */}
        <div className="chart-card">
          <div className="chart-title"><PieIcon size={18} /> Win / Loss Dağılımı</div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  <Cell fill="var(--color-success)" />
                  <Cell fill="var(--color-danger)" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)', borderRadius: '8px' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Symbol Performance Bar */}
        <div className="chart-card">
          <div className="chart-title"><Zap size={18} /> En Karlı Semboller</div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symbolChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)', borderRadius: '8px' }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {symbolChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Advanced Metrics Grid */}
        <div className="chart-card">
          <div className="chart-title"><Award size={18} /> İşlem İstatistikleri</div>
          <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>En İyi Seri</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)' }}>🔥 {s.bestStreak || 0}</div>
            </div>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Max Drawdown</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-danger)' }}>{(s.maxDrawdown || 0).toFixed(2)}%</div>
            </div>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Avg Risk/Reward</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{(parseFloat(s.avg_risk_reward) || 0).toFixed(2)}</div>
            </div>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Ortalam İşlem Süresi</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{Math.round(s.avg_duration_min || 0)} dk</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
