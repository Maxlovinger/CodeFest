'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart2, PieChart as PieIcon, Zap, Send } from 'lucide-react';
import PageNav from '@/components/PageNav';

const BLIGHT_BY_ZIP = [
  { zip: '19140', score: 87, count: 312 },
  { zip: '19132', score: 82, count: 289 },
  { zip: '19121', score: 78, count: 241 },
  { zip: '19134', score: 75, count: 198 },
  { zip: '19143', score: 71, count: 187 },
  { zip: '19104', score: 65, count: 162 },
  { zip: '19146', score: 61, count: 143 },
  { zip: '19103', score: 42, count: 89 },
  { zip: '19102', score: 38, count: 67 },
  { zip: '19107', score: 31, count: 45 },
];

const VIOLATION_TYPES = [
  { name: 'Structural', value: 38, color: '#FF2D55' },
  { name: 'Sanitation', value: 27, color: '#00BFFF' },
  { name: 'Electrical', value: 19, color: '#FFCC00' },
  { name: 'Other', value: 16, color: '#B13BFF' },
];

const MONTHLY_TREND = [
  { month: "Apr '24", vacant: 18200, violations: 3100, evictions: 280 },
  { month: "Jun '24", vacant: 18800, violations: 3400, evictions: 310 },
  { month: "Aug '24", vacant: 19200, violations: 3650, evictions: 295 },
  { month: "Oct '24", vacant: 19700, violations: 3820, evictions: 320 },
  { month: "Dec '24", vacant: 20100, violations: 3940, evictions: 340 },
  { month: "Feb '25", vacant: 20800, violations: 4100, evictions: 355 },
  { month: "Apr '25", vacant: 21400, violations: 4250, evictions: 375 },
];

const RISK_DISTRIBUTION = [
  { tier: 'Critical', count: 1840, color: '#FF2D55' },
  { tier: 'High', count: 4320, color: '#FF6B35' },
  { tier: 'Medium', count: 7890, color: '#FFCC00' },
  { tier: 'Low', count: 7200, color: '#00E5A0' },
];

const TOOLTIP_STYLE = {
  background: 'rgba(9,0,64,0.97)',
  border: '1px solid rgba(177,59,255,0.25)',
  borderRadius: '8px',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  color: 'white',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};
const TOOLTIP_LABEL_STYLE = { color: 'rgba(255,255,255,0.9)', fontFamily: 'Syne, sans-serif', fontWeight: 600 };
const TOOLTIP_ITEM_STYLE = { color: 'rgba(255,255,255,0.85)', fontFamily: 'JetBrains Mono, monospace' };

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(13,0,60,0.6)',
        border: '1px solid rgba(177,59,255,0.15)',
        backdropFilter: 'blur(12px)',
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--electric)' }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function InsightsPage() {
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [question, setQuestion] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchInsight = async (q?: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingInsight(true);
    setAiInsight('');
    try {
      const res = await fetch('/api/ai/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q || 'Analyze current trends in Philadelphia housing crisis data and provide 3 key insights with specific policy recommendations.' }),
        signal: controller.signal,
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiInsight(prev => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
    } finally {
      if (abortRef.current === controller) setLoadingInsight(false);
    }
  };

  useEffect(() => {
    fetchInsight();
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageNav />

      {/* Scrollable content — pt-14 clears fixed nav */}
      <div className="min-h-screen pt-20" style={{ background: 'var(--void)' }}>
        {/* Ambient glow */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(71,19,150,0.18) 0%, transparent 65%)' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-5 py-8">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'Syne', color: 'var(--electric)' }}>
              Holmes Project · Analytics
            </p>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              Trend Intelligence
            </h1>
            <p className="text-sm mt-1" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Philadelphia Housing Crisis — Real-time Data Analysis
            </p>
          </motion.div>

          {/* AI Insight Panel */}
          <motion.div
            className="mb-8 rounded-xl p-5"
            style={{
              background: 'rgba(71,19,150,0.08)',
              border: '1px solid rgba(177,59,255,0.2)',
              borderLeft: '3px solid var(--electric)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} style={{ color: 'var(--electric)' }} aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: 'Syne', color: 'var(--electric)' }}>
                Holmes AI Trend Analysis
              </span>
              {loadingInsight && (
                <div className="flex gap-0.5 ml-2" aria-label="Loading">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i} className="w-1 h-1 rounded-full"
                      style={{ background: 'var(--electric)' }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.7 }}>
              {aiInsight || (loadingInsight ? 'Analyzing data patterns...' : '')}
            </p>

            <div className="flex gap-2">
              <label htmlFor="trend-question" className="sr-only">Ask about trends</label>
              <input
                id="trend-question"
                type="text"
                placeholder="Ask about trends, patterns, or interventions..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchInsight(question)}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none cursor-text"
                style={{
                  background: 'rgba(9,0,64,0.6)',
                  border: '1px solid rgba(177,59,255,0.2)',
                  color: 'var(--text-primary)',
                  fontFamily: 'DM Sans',
                  caretColor: 'var(--electric)',
                  minHeight: '36px',
                }}
              />
              <button
                onClick={() => fetchInsight(question)}
                disabled={loadingInsight}
                className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150 disabled:opacity-50 min-h-[36px]"
                style={{
                  background: 'linear-gradient(135deg, var(--electric), var(--royal-bright))',
                  color: 'white',
                  fontFamily: 'Syne',
                }}
              >
                <Send size={11} aria-hidden="true" />
                Analyze
              </button>
            </div>
          </motion.div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <ChartCard title="Crisis Trajectory (12 Months)" icon={<TrendingUp size={14} />}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={MONTHLY_TREND}>
                  <defs>
                    <linearGradient id="vacantGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B13BFF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#B13BFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="violGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(177,59,255,0.07)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'DM Sans' }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                  <Area type="monotone" dataKey="vacant" stroke="#B13BFF" fill="url(#vacantGrad)" name="Vacant" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="violations" stroke="#FF6B35" fill="url(#violGrad)" name="Violations" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Avg Blight Score by ZIP Code" icon={<BarChart2 size={14} />}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={BLIGHT_BY_ZIP} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(177,59,255,0.07)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'JetBrains Mono' }} domain={[0, 100]} />
                  <YAxis dataKey="zip" type="category" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9, fontFamily: 'JetBrains Mono' }} width={44} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                  <Bar dataKey="score" name="Blight Score" radius={[0, 3, 3, 0]}>
                    {BLIGHT_BY_ZIP.map(entry => (
                      <Cell key={entry.zip} fill={entry.score >= 80 ? '#FF2D55' : entry.score >= 60 ? '#FF6B35' : entry.score >= 40 ? '#FFCC00' : '#00E5A0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Violation Type Distribution" icon={<PieIcon size={14} />}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={VIOLATION_TYPES} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, value }) => `${name} ${value}%`} labelLine={{ stroke: 'rgba(255,255,255,0.15)' }}>
                    {VIOLATION_TYPES.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Risk Tier Distribution" icon={<BarChart2 size={14} />}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={RISK_DISTRIBUTION}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(177,59,255,0.07)" />
                  <XAxis dataKey="tier" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'DM Sans' }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                  <Bar dataKey="count" name="Properties" radius={[4, 4, 0, 0]}>
                    {RISK_DISTRIBUTION.map(entry => (
                      <Cell key={entry.tier} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Footer spacing */}
          <div className="h-8" />
        </div>
      </div>
    </>
  );
}
