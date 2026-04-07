'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onComplete: () => void;
}

const SOURCES = [
  { name: 'Vacant Buildings', key: 'vacant_buildings' },
  { name: 'Vacant Land', key: 'vacant_land' },
  { name: 'Property Assessments', key: 'property_assessments' },
  { name: 'L&I Violations', key: 'violations' },
  { name: 'Eviction Filings', key: 'evictions' },
  { name: 'Neighborhood Boundaries', key: 'neighborhoods' },
];

// Philadelphia skyline SVG silhouette
function PhillySkyline() {
  return (
    <svg
      viewBox="0 0 800 200"
      className="w-full max-w-2xl"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 20px rgba(177,59,255,0.4))' }}
    >
      {/* City Hall dome + tower */}
      <rect x="360" y="60" width="80" height="140" fill="#471396" />
      <rect x="385" y="20" width="30" height="50" fill="#471396" />
      <ellipse cx="400" cy="20" rx="20" ry="8" fill="#471396" />
      <rect x="396" y="2" width="8" height="25" fill="#B13BFF" />
      {/* Comcast Center (Liberty One) */}
      <rect x="480" y="30" width="60" height="170" fill="#471396" />
      <polygon points="480,30 510,5 540,30" fill="#471396" />
      {/* 30th St Station */}
      <rect x="50" y="80" width="120" height="120" fill="#471396" />
      <rect x="60" y="60" width="100" height="30" fill="#471396" />
      <rect x="80" y="40" width="60" height="25" fill="#471396" />
      {/* Ben Franklin Bridge towers */}
      <rect x="680" y="50" width="20" height="150" fill="#471396" />
      <rect x="720" y="50" width="20" height="150" fill="#471396" />
      {/* Bridge cables */}
      <path d="M 690 55 Q 720 100 750 55" stroke="#471396" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M 690 55 Q 660 100 630 130" stroke="#471396" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Mid-rise buildings */}
      <rect x="200" y="90" width="50" height="110" fill="#2D0B5E" />
      <rect x="260" y="100" width="40" height="100" fill="#2D0B5E" />
      <rect x="310" y="110" width="35" height="90" fill="#2D0B5E" />
      <rect x="555" y="70" width="45" height="130" fill="#2D0B5E" />
      <rect x="610" y="85" width="40" height="115" fill="#2D0B5E" />
      <rect x="160" y="100" width="35" height="100" fill="#2D0B5E" />
      {/* Ground */}
      <rect x="0" y="198" width="800" height="4" fill="#471396" opacity="0.5" />
      {/* Electric glow on Liberty One */}
      <rect x="480" y="30" width="60" height="170" fill="url(#buildingGlow)" opacity="0.3" />
      <defs>
        <linearGradient id="buildingGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B13BFF" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Compass Rose SVG
function CompassRose({ size = 80, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring */}
      <circle cx="40" cy="40" r="38" stroke="#B13BFF" strokeWidth="1" fill="none" opacity="0.4" />
      <circle cx="40" cy="40" r="32" stroke="#471396" strokeWidth="0.5" fill="none" opacity="0.3" />
      {/* Cardinal points */}
      <polygon points="40,4 44,36 40,40 36,36" fill="#FFCC00" />
      <polygon points="40,76 44,44 40,40 36,44" fill="#471396" />
      <polygon points="4,40 36,44 40,40 36,36" fill="#471396" />
      <polygon points="76,40 44,36 40,40 44,44" fill="#B13BFF" />
      {/* Ordinal points */}
      <polygon points="40,4 44,26 40,30 36,26" fill="#FFCC00" opacity="0.5" transform="rotate(45 40 40)" />
      <polygon points="40,4 44,26 40,30 36,26" fill="#471396" opacity="0.5" transform="rotate(135 40 40)" />
      <polygon points="40,4 44,26 40,30 36,26" fill="#B13BFF" opacity="0.5" transform="rotate(225 40 40)" />
      <polygon points="40,4 44,26 40,30 36,26" fill="#471396" opacity="0.5" transform="rotate(315 40 40)" />
      {/* Center */}
      <circle cx="40" cy="40" r="4" fill="#FFCC00" />
      <circle cx="40" cy="40" r="2" fill="#090040" />
      {/* N label */}
      <text x="38" y="16" fill="#FFCC00" fontSize="7" fontFamily="Syne, sans-serif" fontWeight="700">N</text>
    </svg>
  );
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentSource, setCurrentSource] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<Record<string, 'pending' | 'loading' | 'done' | 'error'>>({});
  const [message, setMessage] = useState('Initializing...');
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function runIngestion() {
      try {
        // First check stats
        setMessage('Checking database...');
        const statsRes = await fetch('/api/stats');
        const stats = await statsRes.json();

        if (parseInt(stats.vacant_buildings || '0') > 0) {
          // Already has data, skip ingestion
          setMessage('Survey data loaded from cache');
          setProgress(100);
          SOURCES.forEach(s => setSourceStatus(prev => ({ ...prev, [s.key]: 'done' })));
          setTimeout(() => setDone(true), 800);
          setTimeout(() => onComplete(), 1400);
          return;
        }

        // Need to ingest
        setMessage('Commencing Philadelphia survey...');

        // Simulate per-source progress while actual ingestion runs
        const ingestPromise = fetch('/api/ingest');

        for (let i = 0; i < SOURCES.length; i++) {
          const source = SOURCES[i];
          setCurrentSource(i);
          setSourceStatus(prev => ({ ...prev, [source.key]: 'loading' }));
          setMessage(`Ingesting ${source.name}... (${i + 1}/${SOURCES.length})`);
          setProgress(Math.round((i / SOURCES.length) * 85));
          await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
          setSourceStatus(prev => ({ ...prev, [source.key]: 'done' }));
        }

        setMessage('Computing blight scores...');
        setProgress(90);

        await ingestPromise;

        setMessage('Survey complete. Rendering map...');
        setProgress(100);
        setTimeout(() => setDone(true), 600);
        setTimeout(() => onComplete(), 1200);
      } catch (err) {
        setMessage('Survey error — loading cached data...');
        setProgress(100);
        setTimeout(() => setDone(true), 800);
        setTimeout(() => onComplete(), 1400);
      }
    }

    runIngestion();
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center survey-grid"
          style={{ background: 'var(--void)' }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 60%, rgba(71,19,150,0.3) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-6 px-8 max-w-2xl w-full">
            {/* Skyline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <PhillySkyline />
            </motion.div>

            {/* Logo + Title */}
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <CompassRose size={72} className="animate-spin-slow" />

              <h1
                className="text-5xl font-bold text-center tracking-tight"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
              >
                The Holmes Project
              </h1>

              <p
                className="text-center text-lg"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-secondary)', fontStyle: 'italic' }}
              >
                Mapping Philadelphia's Housing Crisis — Block by Block
              </p>

              <p
                className="text-xs tracking-widest uppercase"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-muted)' }}
              >
                Named for Thomas Holme · Surveyor General · 1683
              </p>
            </motion.div>

            {/* Progress Section */}
            <motion.div
              className="w-full flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              {/* Status message */}
              <p
                className="text-center text-sm"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--electric)' }}
              >
                {message}
              </p>

              {/* Progress bar */}
              <div
                className="w-full h-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(177,59,255,0.15)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, var(--electric) 0%, var(--gold) 100%)',
                    boxShadow: '0 0 12px rgba(177,59,255,0.6)',
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>

              {/* Source dots */}
              <div className="flex justify-center gap-2 flex-wrap">
                {SOURCES.map((source, i) => {
                  const status = sourceStatus[source.key] || 'pending';
                  return (
                    <motion.div
                      key={source.key}
                      className="flex items-center gap-1.5"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.1 }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: status === 'done' ? 'var(--gold)' :
                                     status === 'loading' ? 'var(--electric)' :
                                     status === 'error' ? 'var(--risk-critical)' :
                                     'rgba(177,59,255,0.2)',
                          boxShadow: status === 'loading' ? '0 0 8px var(--electric)' :
                                     status === 'done' ? '0 0 6px var(--gold-glow)' : 'none',
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          color: status === 'done' ? 'var(--gold)' :
                                 status === 'loading' ? 'var(--electric)' :
                                 'var(--text-muted)',
                        }}
                      >
                        {source.name}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
