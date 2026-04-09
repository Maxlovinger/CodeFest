'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPinned, RadioTower, ShieldAlert, Users, Wifi, WifiOff } from 'lucide-react';
import PageNav from '@/components/PageNav';
import SignalMap from '@/components/SignalMap';

interface SignalTract {
  geoid: string;
  name: string;
  place_label?: string;
  pct_broadband: number;
  pct_no_internet: number;
  pct_no_devices: number;
  pct_minority: number;
  median_income: number;
  population: number;
  wifi_site_count: number;
  avg_site_speed_mbps: number;
  risk_score: number;
  risk_tier: string;
}

interface WifiSite {
  site_name: string;
  street_address: string;
  council_district: string;
  census_tract_id: string;
  zip: string;
  program_type: string;
  public_wifi_available: string;
  current_internet_speed: string;
  speed_down_mbps: number;
}

const FILTERS = [
  { value: 'all', label: 'all' },
  { value: 'critical', label: 'severe' },
  { value: 'high', label: 'high' },
  { value: 'medium', label: 'medium' },
  { value: 'low', label: 'low' },
];

function tierTone(tier: string) {
  if (tier === 'critical') return '#FF2D55';
  if (tier === 'high') return '#FF6B35';
  if (tier === 'medium') return '#FFCC00';
  return '#00E5A0';
}

function formatPercent(value: number | string | undefined) {
  const numeric = Number(value || 0);
  const scaled = numeric <= 1 ? numeric * 100 : numeric;
  return `${scaled.toFixed(1)}%`;
}

function formatNumber(value: number | string | undefined) {
  return Math.round(Number(value || 0)).toLocaleString();
}

function tractRiskExplanation(tract: SignalTract) {
  const drivers: string[] = [];
  if (Number(tract.pct_no_internet || 0) >= 0.12) drivers.push('a relatively high share of households without internet service');
  if (Number(tract.pct_no_devices || 0) >= 0.08) drivers.push('device scarcity that makes recovery harder even when service exists');
  if (Number(tract.pct_broadband || 0) <= 0.75) drivers.push('lower broadband availability than a well-connected tract');
  if (Number(tract.wifi_site_count || 0) === 0) drivers.push('no mapped public Wi-Fi fallback sites inside the tract');
  if (Number(tract.median_income || 0) <= 55000) drivers.push('income pressure that can make service disruption more damaging');

  if (!drivers.length) {
    return 'This tract is still elevated because the score blends multiple stress signals together, even when no single metric looks extreme on its own.';
  }

  return `This tract scores higher because it shows ${drivers.join(', ')}.`;
}

export default function SignalMapPage() {
  const [riskFilter, setRiskFilter] = useState('all');
  const [showWifi, setShowWifi] = useState(true);
  const [selectedTract, setSelectedTract] = useState<SignalTract | null>(null);
  const [selectedSite, setSelectedSite] = useState<WifiSite | null>(null);
  const [sites, setSites] = useState<WifiSite[]>([]);
  const [tractBrief, setTractBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    if (!selectedTract?.geoid) {
      setSites([]);
      return;
    }

    let cancelled = false;
    fetch(`/api/signal/sites?tract_id=${selectedTract.geoid}&limit=24`, { cache: 'no-store' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load Wi-Fi sites');
        if (!cancelled) setSites(data.sites ?? []);
      })
      .catch(() => {
        if (!cancelled) setSites([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTract]);

  useEffect(() => {
    if (!selectedTract) {
      setTractBrief('');
      setBriefLoading(false);
      return;
    }

    let cancelled = false;
    setBriefLoading(true);
    setTractBrief('');

    (async () => {
      try {
        const res = await fetch('/api/ai/signal-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tract: selectedTract }),
        });

        if (!res.ok) {
          const errorText = (await res.text()) || 'Holmes AI could not generate a tract brief right now.';
          if (!cancelled) setTractBrief(errorText);
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;

        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          accumulated += decoder.decode(value);
          setTractBrief(accumulated);
        }
      } catch {
        if (!cancelled) setTractBrief('Holmes AI could not generate a tract brief right now.');
      } finally {
        if (!cancelled) setBriefLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTract]);

  const tone = tierTone(selectedTract?.risk_tier || 'low');

  const handleSelectTract = useCallback((tract: SignalTract) => {
    setSelectedSite(null);
    setSelectedTract(tract);
  }, []);

  const handleSelectSite = useCallback((site: WifiSite) => {
    setSelectedTract(null);
    setSelectedSite(site);
  }, []);

  const tractMetrics = useMemo(() => {
    if (!selectedTract) return [];
    return [
      {
        label: 'No internet',
        value: formatPercent(selectedTract.pct_no_internet),
        icon: <WifiOff size={15} />,
        description: 'Share of households in this tract that report no home internet service at all.',
      },
      {
        label: 'Broadband access',
        value: formatPercent(selectedTract.pct_broadband),
        icon: <Wifi size={15} />,
        description: 'Share of households with broadband-type internet available in this tract.',
      },
      {
        label: 'Wi-Fi sites',
        value: `${Number(selectedTract.wifi_site_count || 0)}`,
        icon: <RadioTower size={15} />,
        description: 'Known public Wi-Fi locations that may offer local fallback access if home service is weak.',
      },
      {
        label: 'Avg site speed',
        value: `${Math.round(Number(selectedTract.avg_site_speed_mbps || 0)) || 0} Mbps`,
        icon: <MapPinned size={15} />,
        description: 'Average listed download speed across mapped Wi-Fi sites in this tract. It is not a guarantee of what every person will experience.',
      },
    ];
  }, [selectedTract]);

  const siteAccessLabel = selectedSite?.public_wifi_available === 'Y' ? 'Public access' : 'Limited access';
  const siteAccessExplanation =
    selectedSite?.public_wifi_available === 'Y'
      ? 'This site is marked as public access because the city dataset indicates people can use the Wi-Fi more openly on site. It matters because it can serve as a realistic backup option when home internet is down or unavailable.'
      : 'This site is marked as limited access because the city dataset suggests availability may be restricted by building rules, hours, eligibility, or on-site use conditions. It still matters as nearby connectivity infrastructure, but it may not work as a drop-in option for everyone.';

  return (
    <>
      <PageNav />

      <div className="map-viewport pt-20" style={{ background: 'var(--void)' }}>
        <div className="absolute inset-0 z-0">
          <SignalMap
            riskFilter={riskFilter}
            showWifi={showWifi}
            onSelectTract={handleSelectTract}
            onSelectSite={handleSelectSite}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 px-4 sm:px-5">
          <div className="mx-auto grid max-w-7xl items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <motion.div
              className="pointer-events-auto max-w-3xl rounded-[28px] p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(5,10,34,0.94) 0%, rgba(8,16,64,0.88) 52%, rgba(22,7,70,0.9) 100%)',
                border: '1px solid rgba(124,217,255,0.18)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
              }}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-3 flex items-center gap-3">
                <Link
                  href="/signal"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-white"
                  style={{ borderColor: 'rgba(124,217,255,0.18)', background: 'rgba(255,255,255,0.04)' }}
                  aria-label="Back to Dead Zone overview"
                >
                  <ChevronLeft size={16} />
                </Link>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                    Dead Zone Detective
                  </p>
                  <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Connectivity risk across Philadelphia
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm leading-6" style={{ color: 'rgba(255,255,255,0.76)', fontFamily: 'DM Sans, sans-serif' }}>
                Click a tract to understand why it scores higher or lower. Click a Wi-Fi dot to see what that site is, what listed speed means, and why it matters to residents.
              </p>
            </motion.div>

            <motion.aside
              className="pointer-events-auto flex w-full min-h-0 flex-col gap-4 lg:h-[calc(100vh-7.5rem)]"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08, duration: 0.45 }}
            >
              <div
                className="shrink-0 rounded-[24px] p-4"
                style={{
                  background: 'rgba(6, 12, 39, 0.86)',
                  border: '1px solid rgba(124,217,255,0.14)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div className="grid gap-4">
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.24em]" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                      Risk tier
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {FILTERS.map(filter => (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setRiskFilter(filter.value)}
                          className="min-h-[38px] rounded-full px-3 py-2 text-[11px] uppercase"
                          style={{
                            background: riskFilter === filter.value ? 'rgba(124,217,255,0.18)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${riskFilter === filter.value ? 'rgba(124,217,255,0.32)' : 'rgba(255,255,255,0.08)'}`,
                            color: riskFilter === filter.value ? '#D9F7FF' : 'rgba(255,255,255,0.72)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[10px] uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.62)' }}>
                    {[
                      { label: 'severe', color: '#FF2D55' },
                      { label: 'high', color: '#FF6B35' },
                      { label: 'medium', color: '#FFCC00' },
                      { label: 'low', color: '#00E5A0' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color, boxShadow: `0 0 12px ${item.color}` }} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowWifi(value => !value)}
                    className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase"
                    style={{
                      background: showWifi ? 'rgba(0,229,160,0.12)' : 'rgba(255,204,0,0.12)',
                      border: `1px solid ${showWifi ? 'rgba(0,229,160,0.24)' : 'rgba(255,204,0,0.22)'}`,
                      color: showWifi ? '#8CF5D0' : '#FFD666',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {showWifi ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {showWifi ? 'Wi-Fi on' : 'Wi-Fi off'}
                  </button>
                </div>
              </div>

              <div
                className="min-h-0 overflow-y-auto rounded-[30px] p-5 max-h-[calc(100vh-22rem)] lg:flex-1 lg:max-h-none"
                style={{
                  background: 'rgba(6, 12, 39, 0.9)',
                  border: '1px solid rgba(124,217,255,0.14)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 18px 50px rgba(0,0,0,0.3)',
                }}
              >
              {selectedSite ? (
                <>
                  <div
                    className="rounded-[24px] p-4"
                    style={{
                      background: 'linear-gradient(145deg, rgba(124,217,255,0.16) 0%, rgba(255,255,255,0.03) 100%)',
                      border: '1px solid rgba(124,217,255,0.24)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                          Wi-Fi access point
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                          {selectedSite.site_name}
                        </h2>
                        <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.56)', fontFamily: 'JetBrains Mono, monospace' }}>
                          TRACT {selectedSite.census_tract_id || 'Unknown'} · DISTRICT {selectedSite.council_district || 'N/A'}
                        </p>
                      </div>
                      <div
                        className="inline-flex min-w-[132px] items-center justify-center rounded-full px-3 py-1 text-center text-[10px] uppercase"
                        style={{ background: 'rgba(124,217,255,0.18)', color: '#7CD9FF', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {siteAccessLabel}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {[
                      {
                        title: 'What this is',
                        tone: '#7CD9FF',
                        body: 'This dot marks a real Philadelphia site that can help people get online when home service is weak, unavailable, or too expensive.',
                      },
                      {
                        title: 'What we are tracking',
                        tone: 'var(--gold)',
                        body: 'We track where these sites are, their listed internet speed, and which tract they support so we can see whether neighborhoods have any backup access when service problems spike.',
                      },
                      {
                        title: 'Access type',
                        tone: '#FFCC00',
                        body: siteAccessExplanation,
                      },
                      {
                        title: 'What listed speed means',
                        tone: '#00E5A0',
                        body: 'Listed speed is the speed reported for that site in the city dataset. It is a useful signal, but real-world speeds can vary based on congestion, device quality, and time of day.',
                      },
                    ].map(item => (
                      <div key={item.title} className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: item.tone, fontFamily: 'Syne, sans-serif' }}>
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-7" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'DM Sans, sans-serif' }}>
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Address', value: selectedSite.street_address || 'Not listed' },
                      { label: 'ZIP code', value: selectedSite.zip || 'Unknown' },
                      { label: 'Listed speed', value: selectedSite.current_internet_speed || `${Math.round(Number(selectedSite.speed_down_mbps || 0))} Mbps` },
                      { label: 'Program type', value: selectedSite.program_type || 'City connectivity support' },
                    ].map(item => (
                      <div key={item.label} className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="mb-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Syne, sans-serif' }}>
                          {item.label}
                        </div>
                        <div className="text-sm text-white" style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : selectedTract ? (
                <>
                  <div
                    className="rounded-[24px] p-4"
                    style={{
                      background: `linear-gradient(145deg, ${tone}18 0%, rgba(255,255,255,0.03) 100%)`,
                      border: `1px solid ${tone}26`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: tone, fontFamily: 'Syne, sans-serif' }}>
                          Selected tract
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                          Tract {selectedTract.name}
                        </h2>
                        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.68)', fontFamily: 'DM Sans, sans-serif' }}>
                          {selectedTract.place_label || 'Philadelphia'}
                        </p>
                        <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.52)', fontFamily: 'JetBrains Mono, monospace' }}>
                          TRACT {selectedTract.geoid}
                        </p>
                      </div>
                      <div className="rounded-full px-3 py-1 text-[10px] uppercase" style={{ background: `${tone}18`, color: tone, fontFamily: 'JetBrains Mono, monospace' }}>
                        {Math.round(Number(selectedTract.risk_score || 0))} {selectedTract.risk_tier}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      <Users size={16} style={{ color: tone }} />
                      Why this tract scores higher
                    </div>
                    <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'DM Sans, sans-serif' }}>
                      {tractRiskExplanation(selectedTract)}
                    </p>
                  </div>

                  <div className="mt-4 rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      <ShieldAlert size={16} style={{ color: 'var(--gold)' }} />
                      Holmes AI tract brief
                    </div>
                    {briefLoading ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif' }}>
                          <span className="flex gap-1">
                            {[0, 1, 2].map(index => (
                              <motion.span
                                key={index}
                                className="h-2 w-2 rounded-full"
                                style={{ background: 'var(--gold)' }}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: index * 0.2 }}
                              />
                            ))}
                          </span>
                          Holmes is generating a tract brief with RAG context…
                        </div>
                        <div className="h-3 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-3 w-[88%] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-3 w-[72%] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    ) : (
                      <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'DM Sans, sans-serif' }}>
                        {tractBrief || 'Select a tract to generate an AI brief.'}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3">
                    {tractMetrics.map(item => (
                      <div key={item.label} className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-xs" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                            {item.icon}
                            {item.label}
                          </div>
                          <div className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                            {item.value}
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.72)', fontFamily: 'DM Sans, sans-serif' }}>
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        title: 'Device scarcity',
                        body: `${formatPercent(selectedTract.pct_no_devices)} of households report no device access. That makes it harder to recover even if service is technically available.`,
                      },
                      {
                        title: 'Income context',
                        body: `Median household income is $${formatNumber(selectedTract.median_income)}. Lower-income tracts can feel outages more sharply because households have fewer backup options.`,
                      },
                      {
                        title: 'Residents represented',
                        body: `${formatNumber(selectedTract.population)} residents are represented in this tract-level signal.`,
                      },
                      {
                        title: 'Risk score',
                        body: 'The risk score combines access gaps, device scarcity, income pressure, and public fallback coverage into one signal for field teams.',
                      },
                    ].map(item => (
                      <div key={item.title} className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="mb-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Syne, sans-serif' }}>
                          {item.title}
                        </div>
                        <p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'DM Sans, sans-serif' }}>
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <ShieldAlert size={16} style={{ color: 'var(--gold)' }} />
                      <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                        Public Wi-Fi inside this tract
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {sites.length ? (
                        sites.slice(0, 6).map(site => (
                          <div key={`${site.site_name}-${site.street_address}`} className="rounded-[18px] px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                              {site.site_name}
                            </div>
                            <div className="mt-1 text-xs leading-5" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'DM Sans, sans-serif' }}>
                              {site.street_address} · {site.zip}
                            </div>
                            <div className="mt-2 text-[11px]" style={{ color: '#7CD9FF', fontFamily: 'JetBrains Mono, monospace' }}>
                              {site.current_internet_speed || `${Math.round(Number(site.speed_down_mbps || 0))} Mbps`} · {site.program_type}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.72)', fontFamily: 'DM Sans, sans-serif' }}>
                          No mapped Wi-Fi sites were returned for this tract yet.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed p-8 text-center" style={{ borderColor: 'rgba(124,217,255,0.16)', background: 'rgba(255,255,255,0.02)' }}>
                  <MapPinned size={28} style={{ color: '#7CD9FF' }} />
                  <h2 className="mt-4 text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Explore the map
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-7" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif' }}>
                    Click a tract polygon to inspect neighborhood risk, or click a Wi-Fi dot to see what that site is tracking and why it matters.
                  </p>
                </div>
              )}
              </div>
            </motion.aside>
          </div>
        </div>
      </div>
    </>
  );
}
