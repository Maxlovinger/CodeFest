'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Layers, SlidersHorizontal, ChevronDown, ChevronUp, AlertTriangle, Map, Home, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

export type LayerKey = 'vacant_parcels' | 'blight_scores' | 'neighborhoods' | 'violations';

export interface LayerConfig {
  key: LayerKey;
  label: string;
  icon: string; // kept for type compat but we now use Lucide
  color: string;
  count?: number;
  enabled: boolean;
  opacity: number;
}

interface SidebarProps {
  layers: LayerConfig[];
  onLayerToggle: (key: LayerKey) => void;
  onOpacityChange: (key: LayerKey, opacity: number) => void;
  riskFilter: string;
  onRiskFilterChange: (tier: string) => void;
}

const LAYER_ICONS: Record<LayerKey, React.ReactNode> = {
  vacant_parcels: <Home size={14} />,
  blight_scores: <ShieldAlert size={14} />,
  neighborhoods: <Map size={14} />,
  violations: <AlertTriangle size={14} />,
};

const RISK_TIERS = [
  { key: 'all', label: 'All Risk', color: 'var(--text-secondary)', dot: '#6B7280' },
  { key: 'critical', label: 'Critical  80+', color: 'var(--risk-critical)', dot: '#FF2D55' },
  { key: 'high', label: 'High  60+', color: 'var(--risk-high)', dot: '#FF6B35' },
  { key: 'medium', label: 'Medium  40+', color: 'var(--risk-medium)', dot: '#FFCC00' },
  { key: 'low', label: 'Low  <40', color: 'var(--risk-low)', dot: '#00E5A0' },
];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className="relative flex-shrink-0 cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-transparent rounded-full"
      style={{
        width: 34,
        height: 18,
        background: enabled ? 'var(--electric)' : 'rgba(255,255,255,0.1)',
        boxShadow: enabled ? '0 0 10px rgba(177,59,255,0.5)' : 'none',
      }}
    >
      <motion.div
        className="absolute top-[3px] w-3 h-3 rounded-full bg-white"
        animate={{ left: enabled ? 17 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
      />
    </button>
  );
}

function LayerRow({ layer, onToggle }: {
  layer: LayerConfig;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-lg transition-all duration-200"
      style={{
        background: layer.enabled ? 'rgba(177,59,255,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${layer.enabled ? 'rgba(177,59,255,0.28)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="flex-shrink-0" style={{ color: layer.enabled ? layer.color : 'var(--text-muted)' }}>
          {LAYER_ICONS[layer.key]}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold leading-none truncate"
            style={{ fontFamily: 'Syne, sans-serif', color: layer.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {layer.label}
          </p>
          {layer.count !== undefined && (
            <p className="text-[10px] mt-0.5 leading-none" style={{ fontFamily: 'JetBrains Mono', color: 'var(--gold)' }}>
              {layer.count.toLocaleString()}
            </p>
          )}
        </div>
        <Toggle enabled={layer.enabled} onToggle={onToggle} />
      </div>
    </div>
  );
}

export default function Sidebar({
  layers,
  onLayerToggle,
  onOpacityChange,
  riskFilter,
  onRiskFilterChange,
}: SidebarProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <motion.aside
      className="fixed left-0 top-20 bottom-12 w-60 z-20 flex flex-col overflow-hidden"
      style={{
        background: 'rgba(9,0,48,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(177,59,255,0.15)',
      }}
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 }}
    >
      <div className="absolute inset-0 survey-grid opacity-40 pointer-events-none" />

      <div className="relative flex flex-col h-full overflow-y-auto p-3 gap-5">
        {/* LAYERS */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 px-1">
            <Layers size={11} style={{ color: 'var(--electric)' }} />
            <span
              className="text-[9px] font-bold tracking-widest uppercase"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}
            >
              Survey Layers
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {layers.map(layer => (
              <LayerRow
                key={layer.key}
                layer={layer}
                onToggle={() => onLayerToggle(layer.key)}
              />
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="flex items-center gap-1.5 mb-2 px-1 w-full cursor-pointer group"
          >
            <SlidersHorizontal size={11} style={{ color: 'var(--electric)' }} />
            <span
              className="text-[9px] font-bold tracking-widest uppercase flex-1 text-left"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}
            >
              Filters
            </span>
            {filtersOpen
              ? <ChevronUp size={11} style={{ color: 'var(--text-muted)' }} />
              : <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />
            }
          </button>

          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                className="flex flex-col gap-1"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <p className="text-[9px] px-1 mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                  Blight Risk Tier
                </p>
                {RISK_TIERS.map(tier => (
                  <button
                    key={tier.key}
                    onClick={() => onRiskFilterChange(tier.key)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer min-h-[36px]"
                    style={{
                      background: riskFilter === tier.key ? 'rgba(177,59,255,0.15)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${riskFilter === tier.key ? 'rgba(177,59,255,0.35)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: tier.dot }}
                    />
                    <span
                      className="text-xs"
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        color: riskFilter === tier.key ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {tier.label}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LEGEND */}
        <div
          className="mt-auto rounded-lg p-3"
          style={{ background: 'rgba(9,0,64,0.6)', border: '1px solid rgba(177,59,255,0.1)' }}
        >
          <p
            className="text-[9px] font-bold tracking-widest uppercase mb-2"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}
          >
            Blight Scale
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              { color: 'var(--risk-critical)', label: 'Critical  80–100', bar: 100 },
              { color: 'var(--risk-high)', label: 'High  60–79', bar: 75 },
              { color: 'var(--risk-medium)', label: 'Medium  40–59', bar: 50 },
              { color: 'var(--risk-low)', label: 'Low  0–39', bar: 28 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans' }}>
                    {item.label}
                  </span>
                </div>
                <div className="h-px w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-px rounded-full"
                    style={{ width: `${item.bar}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
