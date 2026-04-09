'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, FileText, Copy, ChevronDown, ExternalLink, TrendingDown, Users, DollarSign, Flame } from 'lucide-react';
import PageNav from '@/components/PageNav';

const NEIGHBORHOODS = [
  'Kensington', 'Strawberry Mansion', 'Frankford', 'Hunting Park', 'North Philadelphia',
  'Germantown', 'West Philadelphia', 'Mantua', 'Grays Ferry', 'Point Breeze',
  'South Philadelphia', 'Port Richmond', 'Fishtown', 'Brewerytown', 'Nicetown',
];

const COMPARABLES = [
  {
    city: 'Detroit',
    program: 'Detroit Land Bank Authority',
    stat: '40,000+ properties cleared',
    approach: 'Systematic demolition + strategic rehab with community input',
    color: '#FF6B35',
  },
  {
    city: 'Baltimore',
    program: 'Vacants to Value',
    stat: '$130M invested',
    approach: 'Developer incentives + proactive code enforcement',
    color: '#B13BFF',
  },
  {
    city: 'Cleveland',
    program: 'Land Reutilization Program',
    stat: '20,000+ parcels managed',
    approach: 'County-wide land bank + community development focus',
    color: '#00BFFF',
  },
];

function renderBrief(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <h2 key={i} className="text-base font-bold mt-5 mb-2 first:mt-0"
          style={{ fontFamily: 'Syne, sans-serif', color: 'var(--gold)' }}>
          {line.replace('## ', '')}
        </h2>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5"
          style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}>
          {line.replace('### ', '')}
        </h3>
      );
    }
    if (line.match(/^[-*] /)) {
      return (
        <div key={i} className="flex gap-2.5 text-sm leading-relaxed my-1"
          style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans' }}>
          <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--electric)' }}>◈</span>
          <span>{line.replace(/^[-*] /, '')}</span>
        </div>
      );
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
        {line}
      </p>
    );
  });
}

export default function PolicyPage() {
  const [neighborhood, setNeighborhood] = useState('');
  const [policyBrief, setPolicyBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setPolicyBrief('');
    setGenerated(true);
    try {
      const res = await fetch('/api/ai/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ neighborhood }),
      });
      if (!res.ok) {
        const errorText = (await res.text()) || 'Holmes AI is unavailable right now.';
        setPolicyBrief(errorText);
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setPolicyBrief(prev => prev + decoder.decode(value));
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(policyBrief).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <PageNav />

      <div className="min-h-screen pt-20" style={{ background: 'var(--void)' }}>
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 70% 30%, rgba(71,19,150,0.15) 0%, transparent 65%)' }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-5 py-8">
          {/* Header */}
          <motion.div className="mb-8" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'Syne', color: 'var(--electric)' }}>
              Holmes Project · AI Policy
            </p>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              Policy Brief Generator
            </h1>
            <p className="text-sm mt-1" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              AI-powered housing intervention recommendations for Philadelphia
            </p>
          </motion.div>

          {/* Why this matters */}
          <motion.div
            className="mb-8 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(13,0,60,0.6)', border: '1px solid rgba(177,59,255,0.18)', backdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          >
            {/* Section label */}
            <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(177,59,255,0.12)' }}>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'Syne', color: 'var(--electric)' }}>
                Why It Matters
              </p>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Syne', color: 'white' }}>
                Philadelphia's vacancy crisis is not an abstract problem
              </h2>
              <p className="text-sm leading-relaxed max-w-2xl" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.8 }}>
                Every blighted block is a compounding failure - of property ownership, public safety, municipal revenue, and community health. The numbers are real. So are the consequences.
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'rgba(177,59,255,0.08)' }}>
              {[
                { Icon: Flame,        value: '6,600+', label: 'Vacant & blighted properties tracked across Philadelphia', color: '#FF2D55' },
                { Icon: TrendingDown, value: '$8,000',  label: 'Average annual property value loss per blighted neighbor', color: '#FF6B35' },
                { Icon: DollarSign,   value: '$4B+',    label: 'Estimated economic drag on Philadelphia from blight annually', color: '#FFCC00' },
                { Icon: Users,        value: '1 in 8',  label: 'Philadelphia children living in blighted neighborhoods', color: '#B13BFF' },
              ].map(({ Icon, value, label, color }) => (
                <div key={label} className="p-5" style={{ background: 'rgba(9,0,48,0.7)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
                      <Icon size={14} style={{ color }} aria-hidden="true" />
                    </div>
                  </div>
                  <div className="text-2xl font-black mb-1.5" style={{ fontFamily: 'Syne', color }}>{value}</div>
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans', lineHeight: 1.6 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Narrative paragraphs */}
            <div className="px-6 py-6 grid sm:grid-cols-2 gap-6">
              {[
                {
                  heading: 'Blight spreads like infection',
                  body: 'A single vacant property reduces surrounding home values by up to 20%. When clustered - as they are across Kensington, Strawberry Mansion, and North Philly - the effect compounds. Entire blocks become uninsurable, unsellable, and unsafe. Blight is not a symptom of poverty; it actively manufactures it.',
                },
                {
                  heading: 'Public safety follows property health',
                  body: 'Vacant buildings are the leading site for arson, drug activity, and violent crime in Philadelphia. The Philadelphia Fire Department responds to hundreds of vacant-structure fires every year. L&I violations left unaddressed become structural collapses. This is a life-safety issue as much as a housing one.',
                },
                {
                  heading: 'The city loses revenue it cannot afford to lose',
                  body: 'Philadelphia has one of the highest poverty rates of any major U.S. city. Blighted properties generate minimal tax revenue while consuming disproportionate city services - fire response, code enforcement, emergency demolition, and legal costs. Returning even a fraction of vacant land to productive use would materially change the city\'s fiscal position.',
                },
                {
                  heading: 'Displacement follows vacancy',
                  body: 'Counterintuitively, blight and displacement go hand in hand. As neighborhoods deteriorate, long-term residents are pushed out by deteriorating conditions - then priced out when speculative investment eventually arrives. The window for community-centered intervention is narrow. Data-driven tools like this platform exist to open that window wider.',
                },
              ].map(({ heading, body }) => (
                <div key={heading}>
                  <h3 className="text-sm font-bold mb-2" style={{ fontFamily: 'Syne', color: 'white' }}>{heading}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.78 }}>{body}</p>
                </div>
              ))}
            </div>

            {/* Bottom callout */}
            <div className="mx-6 mb-6 px-5 py-4 rounded-xl" style={{ background: 'rgba(177,59,255,0.07)', border: '1px solid rgba(177,59,255,0.2)', borderLeft: '3px solid var(--electric)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.78 }}>
                <span className="font-semibold" style={{ color: 'white' }}>The Holmes Project exists because the data already exists - it just wasn't connected.</span>{' '}
                OpenDataPhilly publishes vacancy records, L&I violations, eviction filings, and property assessments. We pulled them together, scored every parcel with a machine learning blight index, and made the whole picture visible and queryable in real time. The policy brief generator below turns that data into actionable recommendations - for community organizers, city planners, and anyone who needs to make the case for intervention.
              </p>
            </div>
          </motion.div>

          {/* Generator card */}
          <motion.div
            className="rounded-xl p-6 mb-6"
            style={{
              background: 'rgba(13,0,60,0.6)',
              border: '1px solid rgba(177,59,255,0.2)',
              backdropFilter: 'blur(12px)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ fontFamily: 'Syne', color: 'var(--electric)' }}>
              Configure Brief
            </h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label
                  htmlFor="neighborhood-select"
                  className="block text-[10px] uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}
                >
                  Target Neighborhood
                  <span className="ml-1 normal-case tracking-normal" style={{ color: 'var(--text-muted)' }}>
                    (leave blank for citywide)
                  </span>
                </label>
                <div className="relative">
                  <select
                    id="neighborhood-select"
                    value={neighborhood}
                    onChange={e => setNeighborhood(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none appearance-none cursor-pointer pr-8 min-h-[42px]"
                    style={{
                      background: 'rgba(9,0,64,0.7)',
                      border: '1px solid rgba(177,59,255,0.2)',
                      color: neighborhood ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontFamily: 'DM Sans',
                    }}
                  >
                    <option value="">Citywide Philadelphia</option>
                    {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generate}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all duration-150 disabled:opacity-50 min-h-[42px]"
                  style={{
                    background: 'linear-gradient(135deg, var(--electric), var(--royal-bright))',
                    color: 'white',
                    fontFamily: 'Syne',
                    boxShadow: '0 4px 20px rgba(177,59,255,0.25)',
                  }}
                  aria-busy={loading}
                >
                  <Zap size={14} aria-hidden="true" />
                  {loading ? 'Generating...' : 'Generate Brief'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Comparables (shown before generation) */}
          <AnimatePresence mode="wait">
            {!generated && (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: 0.2 }}
              >
                {COMPARABLES.map(ex => (
                  <div
                    key={ex.city}
                    className="rounded-xl p-4"
                    style={{
                      background: 'rgba(13,0,60,0.5)',
                      border: '1px solid rgba(177,59,255,0.12)',
                    }}
                  >
                    <div
                      className="w-1 h-8 rounded-full mb-3"
                      style={{ background: ex.color }}
                    />
                    <p className="text-[9px] uppercase tracking-widest mb-1"
                      style={{ fontFamily: 'Syne', color: 'var(--text-muted)' }}>
                      Comparable City
                    </p>
                    <h4 className="text-sm font-bold mb-0.5"
                      style={{ fontFamily: 'Syne', color: 'var(--text-primary)' }}>
                      {ex.city}
                    </h4>
                    <p className="text-xs mb-2" style={{ color: ex.color, fontFamily: 'DM Sans' }}>
                      {ex.program}
                    </p>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--gold)', fontFamily: 'JetBrains Mono' }}>
                      {ex.stat}
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                      {ex.approach}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated brief */}
          <AnimatePresence>
            {generated && (
              <motion.div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(9,0,48,0.85)',
                  border: '1px solid rgba(177,59,255,0.2)',
                  backdropFilter: 'blur(16px)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Brief header */}
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(177,59,255,0.15)', background: 'rgba(71,19,150,0.12)' }}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={15} style={{ color: 'var(--electric)' }} aria-hidden="true" />
                    <div>
                      <h3 className="text-sm font-bold" style={{ fontFamily: 'Syne', color: 'var(--text-primary)' }}>
                        {neighborhood ? `${neighborhood} Housing Policy Brief` : 'Philadelphia Citywide Housing Policy Brief'}
                      </h3>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        Holmes AI · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {policyBrief && !loading && (
                    <button
                      onClick={copy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 min-h-[32px]"
                      style={{
                        background: copied ? 'rgba(0,229,160,0.12)' : 'rgba(255,204,0,0.08)',
                        border: `1px solid ${copied ? 'rgba(0,229,160,0.25)' : 'rgba(255,204,0,0.2)'}`,
                        color: copied ? '#00E5A0' : 'var(--gold)',
                        fontFamily: 'Syne',
                      }}
                      aria-label="Copy brief to clipboard"
                    >
                      <Copy size={11} aria-hidden="true" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>

                {/* Brief content */}
                <div className="px-5 py-5">
                  {loading && !policyBrief && (
                    <div className="flex items-center gap-3 py-4">
                      <Zap size={14} style={{ color: 'var(--electric)' }} aria-hidden="true" />
                      <div className="flex gap-0.5" aria-label="Generating">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i} className="w-1.5 h-1.5 rounded-full"
                            style={{ background: 'var(--electric)' }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                        Generating policy brief...
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {renderBrief(policyBrief)}
                    {loading && policyBrief && (
                      <span className="inline-flex gap-0.5 ml-1 align-middle">
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i} className="w-1 h-1 rounded-full inline-block"
                            style={{ background: 'var(--electric)' }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-12" />
        </div>
      </div>
    </>
  );
}
