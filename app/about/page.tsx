'use client';

import { motion } from 'framer-motion';
import PageNav from '@/components/PageNav';

const DATA_SOURCES = [
  { name: 'Vacant Buildings', source: 'OpenDataPhilly', type: 'GeoJSON', update: 'Weekly' },
  { name: 'Vacant Land', source: 'OpenDataPhilly', type: 'GeoJSON', update: 'Weekly' },
  { name: 'Property Assessments', source: 'OPA Philadelphia', type: 'SQL API', update: 'Monthly' },
  { name: 'L&I Code Violations', source: 'OpenDataPhilly', type: 'GeoJSON', update: 'Daily' },
  { name: 'Eviction Filings', source: 'Philadelphia Courts', type: 'GeoJSON', update: 'Monthly' },
  { name: 'Neighborhood Boundaries', source: 'Azavea / PASDA', type: 'GeoJSON', update: 'Annual' },
  { name: 'Philadelphia Connectivity Tracts', source: 'Philadelphia ArcGIS', type: 'GeoJSON', update: 'Live ingest' },
  { name: 'Public Wi-Fi Locations', source: 'Philadelphia ArcGIS', type: 'GeoJSON', update: 'Live ingest' },
  { name: 'Inhibitor Audit Logs', source: 'Challenge sample logs', type: 'CSV / JSONL', update: 'Live ingest' },
];

const TECH_STACK = [
  { name: 'Next.js 16', role: 'Full-stack framework' },
  { name: 'OpenNext + Cloudflare', role: 'Edge deployment and runtime' },
  { name: 'Neon PostgreSQL', role: 'Always-on database' },
  { name: 'Pinecone', role: 'Vector retrieval with cosine similarity' },
  { name: 'OpenAI + Groq fallback', role: 'Streaming AI response layer' },
  { name: 'Leaflet', role: 'Interactive geospatial layer' },
  { name: 'Framer Motion', role: 'Animation system' },
  { name: 'Recharts', role: 'Data visualization' },
  { name: 'Tailwind CSS v4', role: 'Styling framework' },
];

const CHALLENGE_TRACKS = [
  {
    name: 'Dead Zone Detective',
    summary: 'We extend Holmes into predictive connectivity intelligence using real Philadelphia tract and public Wi-Fi data so judges can see where access stress is concentrated and where fallback infrastructure exists.',
    output: 'Signal overview, live Leaflet map, tract scoring, resident-facing Wi-Fi explanations',
  },
  {
    name: 'Glass Box',
    summary: 'We turn Holmes into an explainability dashboard for Inhibitor logs so a non-technical reviewer can inspect what happened, what triggered it, and what action a team should take next.',
    output: 'Audit dashboard, event timeline, action breakdowns, policy trigger summaries',
  },
  {
    name: 'Culture & Community Innovation Award',
    summary: 'Holmes strengthens shared culture and fosters meaningful community connection by making civic data accessible to residents, organizers, and nonprofits. We reflect and uplift diverse experiences through equity pattern analysis and create environments where collaboration, belonging, and collective growth can thrive.',
    output: 'Multi-stakeholder platform, equity analysis, community-centered data access, shared cultural narrative',
  },
];

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      className="mb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
    >
      <h2
        className="text-[10px] font-bold uppercase tracking-widest mb-4 px-1"
        style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}
      >
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

export default function AboutPage() {
  return (
    <>
      <PageNav />

      <div className="min-h-screen pt-20" style={{ background: 'var(--void)' }}>
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(71,19,150,0.15) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-5 py-10">
          {/* Hero */}
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <svg width="80" height="80" viewBox="0 0 80 80" className="animate-spin-slow" aria-hidden="true">
                <circle cx="40" cy="40" r="38" stroke="#B13BFF" strokeWidth="1.5" fill="none" opacity="0.5" />
                <circle cx="40" cy="40" r="28" stroke="#471396" strokeWidth="0.5" fill="none" opacity="0.3" />
                <polygon points="40,4 44,36 40,40 36,36" fill="#FFCC00" />
                <polygon points="40,76 44,44 40,40 36,44" fill="#471396" />
                <polygon points="4,40 36,44 40,40 36,36" fill="#471396" />
                <polygon points="76,40 44,36 40,40 44,44" fill="#B13BFF" />
                <polygon points="40,4 44,26 40,30 36,26" fill="#FFCC00" opacity="0.4" transform="rotate(45 40 40)" />
                <polygon points="40,4 44,26 40,30 36,26" fill="#471396" opacity="0.4" transform="rotate(135 40 40)" />
                <polygon points="40,4 44,26 40,30 36,26" fill="#B13BFF" opacity="0.4" transform="rotate(225 40 40)" />
                <polygon points="40,4 44,26 40,30 36,26" fill="#471396" opacity="0.4" transform="rotate(315 40 40)" />
                <circle cx="40" cy="40" r="5" fill="#FFCC00" />
                <circle cx="40" cy="40" r="2.5" fill="#090040" />
              </svg>
            </div>

            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'Syne', color: 'var(--electric)' }}>
              Holmes Project · About
            </p>
            <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              The Holmes Project
            </h1>
            <p className="text-base mb-2" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Mapping Philadelphia&apos;s risk systems - block by block
            </p>
            <p className="text-xs tracking-widest" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-muted)' }}>
              Housing intelligence · Connectivity foresight · Audit explainability
            </p>
          </motion.div>

          {/* Origin Story */}
          <Section title="The Name & Its Meaning" delay={0.1}>
            <div
              className="rounded-xl p-6 survey-grid"
              style={{
                background: 'rgba(45,11,94,0.3)',
                border: '1px solid rgba(177,59,255,0.2)',
              }}
            >
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
                In 1683, Thomas Holme laid a grid across a swampy river peninsula and called it Philadelphia -
                the city of brotherly love. As William Penn's Surveyor General, he didn't just draw lines on parchment;
                he mapped a future. His plan allocated public squares, organized neighborhoods, and ensured that the
                city would grow with intentionality.
              </p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
                Three hundred and forty-two years later, Philadelphia's grid still exists - but stretching across it
                are over 21,000 vacant properties, 4,000+ L&I violations, and thousands of eviction filings. The
                city Thomas Holme imagined is in crisis.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
                The Holmes Project carries his name as both tribute and mission. Just as Holme mapped Philadelphia's
                future in 1683, we map the city&apos;s modern stress signals so Philadelphia can plan its next chapter.
                Every vacant building, every blight score, every connectivity gap, and every intervention log becomes
                a clue in a new survey of the city we inherited.
              </p>
            </div>
          </Section>

          <Section title="Challenge Tracks" delay={0.15}>
            <div className="grid grid-cols-1 gap-3">
              {CHALLENGE_TRACKS.map(track => (
                <div
                  key={track.name}
                  className="rounded-xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(45,11,94,0.28) 0%, rgba(9,0,64,0.32) 100%)',
                    border: '1px solid rgba(177,59,255,0.16)',
                  }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--gold)' }}>
                    {track.name}
                  </p>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
                    {track.summary}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {track.output}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* Data Sources */}
          <Section title="Data Sources" delay={0.2}>
            <div className="flex flex-col gap-2">
              {DATA_SOURCES.map(src => (
                <div
                  key={src.name}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{
                    background: 'rgba(45,11,94,0.25)',
                    border: '1px solid rgba(177,59,255,0.12)',
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ fontFamily: 'DM Sans', color: 'var(--text-primary)' }}>
                      {src.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                      {src.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(177,59,255,0.12)', color: 'var(--electric)', fontFamily: 'JetBrains Mono' }}
                    >
                      {src.type}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                      {src.update}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 px-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
              All data sourced from OpenDataPhilly and public city APIs. No personally identifiable information is stored.
            </p>
          </Section>

          {/* Tech Stack */}
          <Section title="Technical Architecture" delay={0.3}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TECH_STACK.map(t => (
                <div
                  key={t.name}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{
                    background: 'rgba(45,11,94,0.25)',
                    border: '1px solid rgba(177,59,255,0.12)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--electric)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ fontFamily: 'Syne', color: 'var(--text-primary)' }}>
                      {t.name}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                      {t.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Codefest */}
          <Section title="Philly Codefest 2026" delay={0.4}>
            <div
              className="rounded-xl p-6 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(71,19,150,0.2) 0%, rgba(9,0,64,0.4) 100%)',
                border: '1px solid rgba(255,204,0,0.2)',
              }}
            >
            <p className="text-base font-bold mb-2" style={{ fontFamily: 'Syne', color: 'var(--gold)' }}>
                Building AI for Philly&apos;s Future
              </p>
              <p className="text-sm leading-relaxed mb-4"
                style={{ color: 'var(--text-secondary)', fontFamily: 'Playfair Display', fontStyle: 'italic', lineHeight: 1.75 }}>
                Submitted to Philly Codefest under the theme &quot;Building AI for Philly&apos;s Future.&quot;
                Holmes now tackles multiple challenge prompts inside one product shell: the original housing-intelligence
                concept, Dead Zone Detective for predictive connectivity risk, and Glass Box for audit-grade AI explainability.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs flex-wrap"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                <span>Philadelphia, PA</span>
                <span style={{ color: 'var(--electric)' }}>◈</span>
                <span>April 2026</span>
                <span style={{ color: 'var(--electric)' }}>◈</span>
                <span>Open Source</span>
              </div>
            </div>
          </Section>

          {/* Footer */}
          <motion.div
            className="text-center pb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Playfair Display', fontStyle: 'italic' }}>
              "He mapped our beginning. We map our present."
            </p>
            <p className="text-[10px] mt-2 tracking-widest uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
              The Holmes Project · 2026
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
