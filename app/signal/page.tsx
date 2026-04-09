'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Antenna,
  ArrowRight,
  BrainCircuit,
  MapPinned,
  Radar,
  RefreshCw,
  Route,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import PageNav from '@/components/PageNav';
import DataIngestButton from '@/components/DataIngestButton';

interface SignalSummary {
  tract_count: string;
  wifi_sites: string;
  avg_risk: string;
  critical_tracts: string;
  avg_speed: string;
  max_updated_at: string;
}

interface TopZone {
  geoid: string;
  name: string;
  risk_score: string;
  risk_tier: string;
  pct_no_internet: string;
  wifi_site_count: string;
}

const LAYER_NOTES = [
  {
    name: 'City tract vulnerability',
    note: 'Philadelphia tract-level broadband, device, and income indicators from the city ArcGIS layer.',
  },
  {
    name: 'Public Wi-Fi footprint',
    note: 'City Wi-Fi locations and site speeds surfaced as field-usable fallback infrastructure.',
  },
  {
    name: 'Risk scoring model',
    note: 'Holmes blends access gaps, device poverty, income pressure, and site density into a tract risk score.',
  },
  {
    name: 'Operational view',
    note: 'This challenge page turns the data into a real map, ranked queues, and plain-language actions.',
  },
];

function tierTone(tier: string) {
  if (tier === 'critical') return '#FF2D55';
  if (tier === 'high') return '#FF6B35';
  if (tier === 'medium') return '#FFCC00';
  return '#00E5A0';
}

function formatDate(value?: string) {
  if (!value) return 'Not loaded yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not loaded yet';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function SignalPage() {
  const [summary, setSummary] = useState<SignalSummary | null>(null);
  const [topZones, setTopZones] = useState<TopZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSummary() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/signal/summary', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to load connectivity summary');
      setSummary(data.summary ?? null);
      setTopZones(data.top_zones ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load connectivity summary');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const kpis = useMemo(() => {
    const tractCount = Number(summary?.tract_count || 0);
    const wifiSites = Number(summary?.wifi_sites || 0);
    const avgRisk = Number(summary?.avg_risk || 0);
    const critical = Number(summary?.critical_tracts || 0);
    const avgSpeed = Number(summary?.avg_speed || 0);

    return [
      { label: 'Tracked tracts', value: tractCount ? tractCount.toLocaleString() : '0', icon: <MapPinned size={15} /> },
      { label: 'Wi-Fi sites', value: wifiSites ? wifiSites.toLocaleString() : '0', icon: <Wifi size={15} /> },
      { label: 'Average risk', value: avgRisk ? Math.round(avgRisk).toString() : '0', icon: <Radar size={15} /> },
      { label: 'Critical tracts', value: critical ? critical.toLocaleString() : '0', icon: <WifiOff size={15} /> },
      { label: 'Avg site speed', value: avgSpeed ? `${Math.round(avgSpeed)} Mbps` : 'N/A', icon: <Antenna size={15} /> },
      { label: 'Last refresh', value: formatDate(summary?.max_updated_at), icon: <RefreshCw size={15} /> },
    ];
  }, [summary]);

  return (
    <>
      <PageNav />

      <div className="min-h-screen pt-20" style={{ background: 'var(--void)' }}>
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(circle at 14% 20%, rgba(124,217,255,0.16) 0%, transparent 28%), radial-gradient(circle at 78% 12%, rgba(177,59,255,0.18) 0%, transparent 30%), linear-gradient(180deg, rgba(9,0,64,0.12) 0%, rgba(9,0,24,0.28) 100%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-8">
          <motion.section
            className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div
              className="relative overflow-hidden rounded-[30px] p-7"
              style={{
                background: 'linear-gradient(145deg, rgba(5,10,34,0.96) 0%, rgba(6,28,57,0.92) 52%, rgba(22,7,70,0.9) 100%)',
                border: '1px solid rgba(124,217,255,0.18)',
                boxShadow: '0 26px 80px rgba(0,0,0,0.35)',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(124,217,255,0.08) 0%, rgba(177,59,255,0.06) 100%)' }}
              />

              <p className="mb-3 text-[10px] uppercase tracking-[0.32em]" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                Challenge · Dead Zone Detective
              </p>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
                We&apos;re tackling broadband blind spots with a live civic signal system, not a mockup.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 sm:text-base" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'DM Sans, sans-serif' }}>
                Holmes now stretches beyond housing intelligence. This challenge surface ingests Philadelphia connectivity data, scores tract-level access risk, maps public Wi-Fi resilience, and gives judges an operational view of where digital frustration is likely to hit hardest.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signal/map"
                  className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,217,255,0.88) 0%, rgba(177,59,255,0.88) 100%)',
                    boxShadow: '0 16px 40px rgba(66, 153, 225, 0.24)',
                    fontFamily: 'Syne, sans-serif',
                  }}
                >
                  Open Dead Zone map
                  <ArrowRight size={16} />
                </Link>

                <DataIngestButton endpoint="/api/signal/ingest" label="Refresh connectivity data" onComplete={loadSummary} />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {kpis.map((item, index) => (
                  <motion.div
                    key={item.label}
                    className="rounded-[22px] px-4 py-4"
                    style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(124,217,255,0.14)' }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + index * 0.04, duration: 0.32 }}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {loading ? '...' : item.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[30px] p-6"
              style={{
                background: 'rgba(7,11,38,0.84)',
                border: '1px solid rgba(124,217,255,0.14)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                    What We Added
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Real challenge infrastructure
                  </h2>
                </div>
                <BrainCircuit size={18} style={{ color: '#7CD9FF' }} />
              </div>

              <div className="space-y-3">
                {LAYER_NOTES.map((layer, index) => (
                  <motion.div
                    key={layer.name}
                    className="rounded-[22px] px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(124,217,255,0.1)' }}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                  >
                    <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {layer.name}
                    </div>
                    <div className="mt-1 text-xs leading-6" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'DM Sans, sans-serif' }}>
                      {layer.note}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <motion.section
              className="rounded-[28px] p-6"
              style={{
                background: 'rgba(4,12,34,0.82)',
                border: '1px solid rgba(0,191,255,0.14)',
                backdropFilter: 'blur(18px)',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.4 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                    Priority Queue
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Highest-risk tracts right now
                  </h2>
                </div>
                <Route size={18} style={{ color: '#7CD9FF' }} />
              </div>

              {error ? (
                <div className="rounded-[22px] border px-4 py-4 text-sm" style={{ borderColor: 'rgba(255,45,85,0.2)', background: 'rgba(255,45,85,0.08)', color: '#FFD7E0' }}>
                  {error}
                </div>
              ) : null}

              <div className="space-y-3">
                {(topZones.length ? topZones : Array.from({ length: 4 }).map((_, index) => ({ geoid: `loading-${index}`, name: 'Loading tract...', risk_score: '0', risk_tier: 'low', pct_no_internet: '0', wifi_site_count: '0' }))).map((zone, index) => {
                  const tone = tierTone(zone.risk_tier);
                  return (
                    <motion.div
                      key={zone.geoid}
                      className="rounded-[24px] p-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${tone}22` }}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + index * 0.05, duration: 0.3 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                            {zone.name}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.62)', fontFamily: 'JetBrains Mono, monospace' }}>
                            TRACT {zone.geoid}
                          </div>
                        </div>
                        <div
                          className="rounded-full px-3 py-1 text-[10px] uppercase"
                          style={{ background: `${tone}18`, color: tone, fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          {loading ? 'Loading' : `${Math.round(Number(zone.risk_score || 0))} ${zone.risk_tier}`}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="mb-1 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.44)', fontFamily: 'Syne, sans-serif' }}>
                            Access stress
                          </p>
                          <p className="text-sm text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            {Number(zone.pct_no_internet || 0).toFixed(1)}% of households report no internet access.
                          </p>
                        </div>
                        <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="mb-1 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.44)', fontFamily: 'Syne, sans-serif' }}>
                            Local fallback
                          </p>
                          <p className="text-sm text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            {Number(zone.wifi_site_count || 0)} mapped public Wi-Fi sites inside the tract.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              className="rounded-[28px] p-6"
              style={{
                background: 'rgba(11,8,42,0.84)',
                border: '1px solid rgba(177,59,255,0.16)',
                backdropFilter: 'blur(18px)',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--electric)', fontFamily: 'Syne, sans-serif' }}>
                    Demo Story
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    How we&apos;re tackling the challenge
                  </h2>
                </div>
                <Sparkles size={18} style={{ color: 'var(--electric)' }} />
              </div>

              <div className="space-y-3">
                {[
                  'Forecast where connectivity complaints are likely to spike, before an ops team gets overwhelmed.',
                  'Blend tract vulnerability with public Wi-Fi resilience so the map is actionable, not just descriptive.',
                  'Let judges move from the strategy page into a live Leaflet map with tract detail and site context.',
                  'Keep the experience accessible and explainable so both civic reviewers and field operators can use it.',
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    className="flex gap-3 rounded-[22px] px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(177,59,255,0.1)' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 + index * 0.05, duration: 0.3 }}
                  >
                    <div className="mt-0.5 h-2.5 w-2.5 rounded-full" style={{ background: index < 2 ? '#7CD9FF' : 'var(--electric)', boxShadow: `0 0 16px ${index < 2 ? '#7CD9FF' : 'rgba(177,59,255,0.7)'}` }} />
                    <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'DM Sans, sans-serif' }}>
                      {item}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>

          <motion.section
            className="mt-8 grid gap-4 md:grid-cols-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
          >
            {[
              {
                title: 'Real public datasets',
                body: 'We ingest Philadelphia tract-level connectivity indicators and city Wi-Fi locations instead of using fabricated demo data.',
              },
              {
                title: 'Actionable map surface',
                body: 'The live Leaflet experience shows where access stress is concentrated and where local fallback infrastructure exists.',
              },
              {
                title: 'Equity signal',
                body: 'Risk scoring blends internet access gaps, device scarcity, income pressure, and site coverage so the map highlights who gets left behind and why.',
              },
            ].map(card => (
              <div
                key={card.title}
                className="rounded-[24px] p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <div className="mb-3 text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {card.title}
                </div>
                <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif' }}>
                  {card.body}
                </p>
              </div>
            ))}
          </motion.section>
        </div>
      </div>
    </>
  );
}
