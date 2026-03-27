import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#58a6ff', '#bc8cff', '#3fb950', '#f85149', '#d29922', '#388bfd'];

export default function PortfolioChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p>Açık işlem yok</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.symbol.replace('USDT', ''),
    value: parseFloat(item.usdt_amount) || 0
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)'
            }} 
          />
          <Legend verticalAlign="bottom" height={36}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
