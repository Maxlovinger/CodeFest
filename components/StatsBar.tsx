'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

interface StatsBarProps {
  onOpenChat: () => void;
}

interface Stats {
  vacant_buildings: string;
  violations: string;
  evictions: string;
  last_ingestion: string;
}

function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    startRef.current = null;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function StatNumber({ value }: { value: number }) {
  const display = useCountUp(value);
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--gold)' }}>
      {display.toLocaleString()}
    </span>
  );
}

export default function StatsBar({ onOpenChat }: StatsBarProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const vacantCount = parseInt(stats?.vacant_buildings || '0');
  const violCount = parseInt(stats?.violations || '0');
  const evictCount = parseInt(stats?.evictions || '0');
  const lastSurvey = stats?.last_ingestion
    ? new Date(stats.last_ingestion).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Pending';

  const tickerItems = [
    <span key="1">✦ <StatNumber value={vacantCount} /> Vacant Properties</span>,
    <span key="sep1" style={{ color: 'var(--electric)' }}> ◈ </span>,
    <span key="2"><StatNumber value={violCount} /> Code Violations</span>,
    <span key="sep2" style={{ color: 'var(--electric)' }}> ◈ </span>,
    <span key="3"><StatNumber value={evictCount} /> Eviction Filings</span>,
    <span key="sep3" style={{ color: 'var(--electric)' }}> ◈ </span>,
    <span key="4" style={{ color: 'var(--text-secondary)' }}>Serving Philadelphia Since 1683</span>,
    <span key="sep4" style={{ color: 'var(--electric)' }}> ◈ </span>,
    <span key="5" style={{ color: 'var(--text-secondary)' }}>Last Survey: <span style={{ color: 'var(--gold)', fontFamily: 'JetBrains Mono' }}>{lastSurvey}</span></span>,
    <span key="sep5" style={{ color: 'var(--electric)' }}> ◈ </span>,
  ];

  // Double for seamless loop
  const allItems = [...tickerItems, ...tickerItems];

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 h-12 z-30 flex items-center justify-between overflow-hidden"
      style={{
        background: 'rgba(9,0,64,0.95)',
        borderTop: '1px solid rgba(177,59,255,0.2)',
        backdropFilter: 'blur(8px)',
      }}
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      {/* Ticker */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex items-center gap-4 animate-ticker whitespace-nowrap text-xs"
          style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-primary)' }}
        >
          {allItems.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>

      {/* Holmes AI Chat button */}
      <button
        onClick={onOpenChat}
        className="flex-shrink-0 flex items-center gap-2 px-4 h-full border-l transition-all duration-200 group"
        style={{
          borderColor: 'rgba(177,59,255,0.2)',
          background: 'rgba(177,59,255,0.05)',
        }}
      >
        <MessageSquare size={14} style={{ color: 'var(--electric)' }} />
        <div className="hidden sm:flex flex-col leading-none">
          <span
            className="text-[11px] font-bold"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}
          >
            Holmes AI
          </span>
          <span className="text-[9px]" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
            Ask anything
          </span>
        </div>
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#00E5A0' }}
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </button>
    </motion.div>
  );
}
