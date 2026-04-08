'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, MapPin, User, DollarSign, AlertTriangle, Calendar, ExternalLink } from 'lucide-react';

interface Property {
  id: number;
  parcel_id: string;
  address: string;
  owner?: string;
  lat: number;
  lng: number;
  market_value?: number;
  total_area?: number;
  zip_code?: string;
  blight_score: number;
  category?: string;
  violations?: Violation[];
}

interface Violation {
  violation_id: string;
  violation_type: string;
  violation_date?: string;
  status?: string;
  description?: string;
}

interface DetailPanelProps {
  property: Property | null;
  neighborhood: string | null;
  onClose: () => void;
}

function blightColor(score: number) {
  if (score >= 80) return '#FF2D55';
  if (score >= 60) return '#FF6B35';
  if (score >= 40) return '#FFCC00';
  return '#00E5A0';
}

function blightLabel(score: number) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function violationTypeColor(type: string) {
  const t = type.toLowerCase();
  if (t.includes('struct') || t.includes('exterior') || t.includes('foundation')) return '#FF2D55';
  if (t.includes('electr')) return '#FFCC00';
  if (t.includes('sanit') || t.includes('rodent')) return '#00BFFF';
  return '#B13BFF';
}

// Circular risk gauge
function RiskGauge({ score }: { score: number }) {
  const color = blightColor(score);
  const label = blightLabel(score);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="rgba(177,59,255,0.15)"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-bold leading-none"
            style={{ fontFamily: 'Syne, sans-serif', color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-[9px] tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
            /100
          </span>
        </div>
      </div>
      <span
        className="text-xs font-bold px-3 py-0.5 rounded-full"
        style={{
          fontFamily: 'Syne, sans-serif',
          color,
          background: `${color}20`,
          border: `1px solid ${color}40`,
        }}
      >
        {label} RISK
      </span>
    </div>
  );
}

// AI analysis streamer
function AIAnalysis({ property }: { property: Property }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const analyze = async () => {
    if (loading) return;
    setLoading(true);
    setStarted(true);
    setText('');
    try {
      const res = await fetch('/api/ai/property-explainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property }),
      });
      if (!res.ok) {
        const errorText = (await res.text()) || 'Holmes AI is unavailable right now.';
        setText(errorText);
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setText(prev => prev + decoder.decode(value));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!started) {
    return (
      <button
        onClick={analyze}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, var(--electric) 0%, var(--royal-bright) 100%)',
          fontFamily: 'Syne, sans-serif',
          color: 'white',
          boxShadow: '0 4px 20px rgba(177,59,255,0.3)',
        }}
      >
        <Zap size={14} />
        Analyze with Holmes AI
      </button>
    );
  }

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'rgba(71,19,150,0.12)',
        border: '1px solid rgba(177,59,255,0.2)',
        borderLeft: '3px solid var(--electric)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Zap size={12} style={{ color: 'var(--electric)' }} />
        <span className="text-[11px] font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}>
          Holmes AI Analysis
        </span>
        {loading && (
          <div className="flex gap-0.5 ml-auto">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ background: 'var(--electric)' }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
      </div>
      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans' }}>
        {text || 'Analyzing...'}
      </p>
    </div>
  );
}

// Neighborhood view
function formatNeighborhoodName(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function NeighborhoodView({ name, onClose }: { name: string; onClose: () => void }) {
  const displayName = formatNeighborhoodName(name);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSummary('');
    (async () => {
      try {
        const res = await fetch('/api/ai/neighborhood-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ neighborhood: name }),
        });
        if (!res.ok) {
          const errorText = (await res.text()) || 'Holmes AI is unavailable right now.';
          if (!cancelled) setSummary(errorText);
          return;
        }
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          setSummary(prev => prev + decoder.decode(value));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [name]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3" style={{ borderBottom: '1px solid rgba(177,59,255,0.15)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Syne' }}>
            Neighborhood
          </p>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
            {displayName}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--electric)', fontFamily: 'DM Sans' }}>
            Philadelphia, PA
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-electric/10"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* AI Summary */}
      <div className="p-4">
        <div
          className="rounded-lg p-3"
          style={{
            background: 'rgba(71,19,150,0.12)',
            border: '1px solid rgba(177,59,255,0.2)',
            borderLeft: '3px solid var(--electric)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} style={{ color: 'var(--electric)' }} />
            <span className="text-[11px] font-bold" style={{ fontFamily: 'Syne', color: 'var(--electric)' }}>
              Holmes AI Intelligence
            </span>
            {loading && (
              <div className="flex gap-0.5 ml-auto">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{ background: 'var(--electric)' }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans' }}>
            {summary || (loading ? 'Generating neighborhood analysis...' : 'No summary available.')}
          </p>
        </div>

        <a
          href="/policy"
          className="flex items-center justify-center gap-2 mt-3 py-2 text-xs font-semibold rounded-lg transition-colors"
          style={{
            fontFamily: 'Syne',
            color: 'var(--gold)',
            background: 'rgba(255,204,0,0.08)',
            border: '1px solid rgba(255,204,0,0.2)',
          }}
        >
          Generate Policy Brief
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

export default function DetailPanel({ property, neighborhood, onClose }: DetailPanelProps) {
  const isOpen = !!(property || neighborhood);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed right-0 top-20 bottom-12 w-80 z-20 flex flex-col overflow-hidden"
          style={{
            background: 'rgba(13,0,60,0.92)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(177,59,255,0.25)',
          }}
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Survey grid texture */}
          <div className="absolute inset-0 survey-grid opacity-30 pointer-events-none" />

          <div className="relative flex flex-col h-full overflow-y-auto">
            {neighborhood && !property ? (
              <NeighborhoodView name={neighborhood} onClose={onClose} />
            ) : property ? (
              <>
                {/* Header */}
                <div className="p-4 pb-3" style={{ borderBottom: '1px solid rgba(177,59,255,0.15)' }}>
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'Syne' }}>
                      Vacant Property
                    </p>
                    <button
                      onClick={onClose}
                      className="p-1 rounded transition-colors hover:bg-electric/10"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <h3
                    className="text-sm font-bold leading-tight"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--gold)' }}
                  >
                    {property.address || 'Unknown Address'}
                  </h3>
                  {property.owner && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans' }}>
                      Owner: {property.owner}
                    </p>
                  )}
                </div>

                {/* Risk Score */}
                <div className="p-4 flex justify-center" style={{ borderBottom: '1px solid rgba(177,59,255,0.15)' }}>
                  <RiskGauge score={property.blight_score || 0} />
                </div>

                {/* Stats Grid */}
                <div className="p-4 grid grid-cols-2 gap-2" style={{ borderBottom: '1px solid rgba(177,59,255,0.15)' }}>
                  {[
                    {
                      icon: <DollarSign size={11} />,
                      label: 'Market Value',
                      value: property.market_value ? `$${parseInt(String(property.market_value)).toLocaleString()}` : 'N/A',
                    },
                    {
                      icon: <MapPin size={11} />,
                      label: 'Parcel Area',
                      value: property.total_area ? `${Math.round(parseFloat(String(property.total_area))).toLocaleString()} sq ft` : 'N/A',
                    },
                    {
                      icon: <MapPin size={11} />,
                      label: 'ZIP Code',
                      value: property.zip_code || 'N/A',
                    },
                    {
                      icon: <AlertTriangle size={11} />,
                      label: 'Category',
                      value: property.category || 'Vacant',
                    },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-lg p-2.5"
                      style={{ background: 'rgba(71,19,150,0.15)', border: '1px solid rgba(177,59,255,0.12)' }}
                    >
                      <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--text-muted)' }}>
                        {stat.icon}
                        <span className="text-[9px] uppercase tracking-wide" style={{ fontFamily: 'DM Sans' }}>
                          {stat.label}
                        </span>
                      </div>
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Violations Timeline */}
                {property.violations && property.violations.length > 0 && (
                  <div className="p-4" style={{ borderBottom: '1px solid rgba(177,59,255,0.15)' }}>
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest mb-3"
                      style={{ fontFamily: 'Syne', color: 'var(--electric)' }}
                    >
                      Code Violations ({property.violations.length})
                    </p>
                    <div className="flex flex-col gap-2">
                      {property.violations.slice(0, 4).map((v, i) => (
                        <div key={v.violation_id || i} className="flex gap-2">
                          <div
                            className="w-0.5 rounded-full flex-shrink-0 mt-1"
                            style={{
                              background: violationTypeColor(v.violation_type || ''),
                              minHeight: '32px',
                            }}
                          />
                          <div className="flex-1">
                            <p
                              className="text-[11px] font-medium leading-tight"
                              style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                            >
                              {v.violation_type || 'Unknown'}
                            </p>
                            {v.violation_date && (
                              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                                {new Date(v.violation_date).toLocaleDateString()}
                                {v.status && ` · ${v.status}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                <div className="p-4">
                  <AIAnalysis property={property} />
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
