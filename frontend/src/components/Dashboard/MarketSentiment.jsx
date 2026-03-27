import React, { useEffect, useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../../api/client';

export default function MarketSentiment() {
  const [aiSentiment, setAiSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSentiment() {
      setLoading(true);
      try {
        const res = await api.get('/dashboard/ai-sentiment');
        setAiSentiment(res.data);
        setError(null);
      } catch (err) {
        setError('AI analiz alınamadı: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="sentiment-card">AI analiz yükleniyor...</div>;
  if (error) return <div className="sentiment-card" style={{ color: 'var(--color-danger)' }}>{error}</div>;

  return (
    <div className="sentiment-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <div className="sentiment-icon" style={{ 
        width: '50px', 
        height: '50px', 
        borderRadius: '50%', 
        background: 'rgba(255, 255, 255, 0.05)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: aiSentiment.confidence > 60 ? 'var(--color-success)' : aiSentiment.confidence < 40 ? 'var(--color-danger)' : 'var(--text-tertiary)',
        border: `1px solid ${aiSentiment.confidence > 60 ? 'var(--color-success)' : aiSentiment.confidence < 40 ? 'var(--color-danger)' : 'var(--text-tertiary)'}33`
      }}>
        <Brain size={28} />
      </div>
      <div className="sentiment-info">
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
          AI Market Sentiment (Gemini)
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {aiSentiment.sentiment} <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>({aiSentiment.confidence}/100)</span>
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: 4 }}>{aiSentiment.summary}</div>
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
          <div style={{ width: `${aiSentiment.confidence}%`, height: '100%', background: aiSentiment.confidence > 60 ? 'var(--color-success)' : aiSentiment.confidence < 40 ? 'var(--color-danger)' : 'var(--text-tertiary)', transition: 'width 1s ease' }}></div>
        </div>
      </div>
    </div>
  );
}
