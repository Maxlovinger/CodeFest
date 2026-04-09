'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, ChevronLeft, ChevronRight, Database, ChevronUp, ChevronDown as ChevronDownIcon } from 'lucide-react';
import PageNav from '@/components/PageNav';
import DataIngestButton from '@/components/DataIngestButton';

interface Property {
  id: number;
  parcel_id: string;
  address: string;
  owner: string;
  lat: number;
  lng: number;
  market_value: number;
  total_area: number;
  zip_code: string;
  blight_score: number;
  category: string;
}

const RISK_TIERS = ['all', 'critical', 'high', 'medium', 'low'];
const PAGE_SIZE = 50;

type SortKey = 'blight_score' | 'market_value' | 'address' | 'zip_code' | 'total_area';
const COLUMNS: { label: string; key: SortKey | null }[] = [
  { label: 'Address',      key: 'address' },
  { label: 'Owner',        key: null },
  { label: 'ZIP',          key: 'zip_code' },
  { label: 'Market Value', key: 'market_value' },
  { label: 'Risk Score',   key: 'blight_score' },
  { label: 'Category',     key: null },
];

function blightColor(score: number) {
  if (score >= 80) return '#FF2D55';
  if (score >= 60) return '#FF6B35';
  if (score >= 40) return '#FFCC00';
  return '#00E5A0';
}

function blightLabel(score: number) {
  if (score >= 80) return 'CRIT';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MED';
  return 'LOW';
}

export default function DataPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskTier, setRiskTier] = useState('all');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>('blight_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey | null) => {
    if (!key) return;
    if (sortBy === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        sort_by: sortBy,
        sort_dir: sortDir,
        ...(search && { search }),
        ...(riskTier !== 'all' && { risk_tier: riskTier }),
      });
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [search, riskTier, page, sortBy, sortDir]);

  useEffect(() => { setPage(0); }, [search, riskTier]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const downloadCSV = () => {
    if (!properties.length) return;
    const headers = ['Parcel ID', 'Address', 'Owner', 'ZIP', 'Market Value', 'Blight Score', 'Category'];
    const rows = properties.map(p => [p.parcel_id, p.address, p.owner, p.zip_code, p.market_value, p.blight_score, p.category]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `holmes-properties-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <PageNav />

      <div className="min-h-screen pt-20" style={{ background: 'var(--void)' }}>
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(71,19,150,0.12) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-5 py-8">
          {/* Header */}
          <motion.div
            className="flex items-start justify-between mb-6"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'Syne', color: 'var(--electric)' }}>
                Holmes Project · Survey Data
              </p>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                Property Database
              </h1>
              <p className="text-sm mt-1" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {total.toLocaleString()} vacant properties · OpenDataPhilly
              </p>
            </div>
            <button
              onClick={downloadCSV}
              disabled={!properties.length}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-40 min-h-[40px]"
              style={{
                background: 'rgba(255,204,0,0.08)',
                border: '1px solid rgba(255,204,0,0.22)',
                color: 'var(--gold)',
                fontFamily: 'Syne',
              }}
              aria-label="Export as CSV"
            >
              <Download size={13} aria-hidden="true" />
              Export CSV
            </button>
          </motion.div>

          <motion.section
            className="grid gap-4 lg:grid-cols-3 mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div
              className="rounded-[24px] p-5 lg:col-span-2"
              style={{
                background: 'linear-gradient(145deg, rgba(5,10,34,0.94) 0%, rgba(8,16,64,0.88) 52%, rgba(22,7,70,0.9) 100%)',
                border: '1px solid rgba(124,217,255,0.18)',
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.28em] mb-2" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                Challenge Data Ops
              </p>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Refresh the new Signal and Glass Box pipelines without leaving the product.
              </h2>
              <p className="text-sm mt-3 max-w-2xl leading-7" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif' }}>
                Holmes now carries three parallel data stories: vacant property intelligence, Dead Zone Detective connectivity scoring, and Glass Box audit explainability. These controls refresh the challenge datasets directly into Neon.
              </p>
              <div className="flex flex-wrap gap-4 mt-5">
                <DataIngestButton endpoint="/api/signal/ingest" label="Refresh signal data" />
                <DataIngestButton endpoint="/api/audit/ingest" label="Refresh audit logs" />
              </div>
            </div>

            <div
              className="rounded-[24px] p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(177,59,255,0.15)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--electric)' }}>
                <Database size={16} />
                <span className="text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif', color: 'white' }}>
                  Loaded sources
                </span>
              </div>
              <div className="space-y-3 text-sm" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif' }}>
                <p>Philadelphia vacant properties from OpenDataPhilly</p>
                <p>Philadelphia connectivity tracts and public Wi-Fi layers from ArcGIS</p>
                <p>Applied AI Studio inhibitor sample logs for Glass Box</p>
              </div>
            </div>
          </motion.section>

          {/* Filters bar */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Search */}
            <div
              className="flex items-center gap-2 flex-1 px-3 py-0 rounded-lg"
              style={{
                background: 'rgba(13,0,60,0.6)',
                border: '1px solid rgba(177,59,255,0.18)',
                minHeight: '40px',
              }}
            >
              <Search size={13} style={{ color: 'var(--electric)', flexShrink: 0 }} aria-hidden="true" />
              <label htmlFor="prop-search" className="sr-only">Search properties</label>
              <input
                id="prop-search"
                type="search"
                placeholder="Search address, owner, ZIP..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm cursor-text"
                style={{ fontFamily: 'DM Sans', color: 'var(--text-primary)', caretColor: 'var(--electric)' }}
              />
            </div>

            {/* Risk tier filters */}
            <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by risk tier">
              {RISK_TIERS.map(tier => (
                <button
                  key={tier}
                  onClick={() => setRiskTier(tier)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all duration-150 min-h-[40px] min-w-[52px]"
                  style={{
                    background: riskTier === tier ? 'rgba(177,59,255,0.18)' : 'rgba(13,0,60,0.4)',
                    border: `1px solid ${riskTier === tier ? 'rgba(177,59,255,0.38)' : 'rgba(177,59,255,0.1)'}`,
                    color: riskTier === tier ? 'white' : 'var(--text-secondary)',
                    fontFamily: 'Syne',
                  }}
                  aria-pressed={riskTier === tier}
                >
                  {tier}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(177,59,255,0.15)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]" aria-label="Philadelphia vacant properties">
                <thead>
                  <tr style={{ background: 'rgba(45,11,94,0.5)', borderBottom: '1px solid rgba(177,59,255,0.15)' }}>
                    {COLUMNS.map(col => {
                      const active = col.key && sortBy === col.key;
                      return (
                        <th
                          key={col.label}
                          scope="col"
                          className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold"
                          style={{ fontFamily: 'Syne, sans-serif', color: active ? 'var(--electric)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}
                        >
                          {col.key ? (
                            <button
                              onClick={() => handleSort(col.key)}
                              className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors duration-100 group"
                              style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit', textTransform: 'inherit' }}
                              aria-sort={active ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                            >
                              {col.label}
                              <span className="flex flex-col opacity-60 group-hover:opacity-100" style={{ color: active ? 'var(--electric)' : 'var(--text-muted)' }}>
                                {active && sortDir === 'asc'
                                  ? <ChevronUp size={10} />
                                  : <ChevronDownIcon size={10} style={{ opacity: active ? 1 : 0.4 }} />
                                }
                              </span>
                            </button>
                          ) : col.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(177,59,255,0.05)' }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div
                              className="h-3 rounded animate-pulse"
                              style={{ background: 'rgba(177,59,255,0.1)', width: `${40 + (j * 7) % 40}%` }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : properties.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center gap-3 py-16">
                          <Database size={28} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                            No properties match your search.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    properties.map((prop, i) => (
                      <motion.tr
                        key={prop.id}
                        className="transition-colors duration-100"
                        style={{ borderBottom: '1px solid rgba(177,59,255,0.05)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(177,59,255,0.04)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.015, 0.2) }}
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            {prop.address || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs truncate max-w-[140px]" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans' }}
                            title={prop.owner}>
                            {prop.owner || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                            {prop.zip_code || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ fontFamily: 'JetBrains Mono', color: prop.market_value ? 'var(--gold)' : 'var(--text-muted)' }}>
                            {prop.market_value ? `$${parseInt(String(prop.market_value)).toLocaleString()}` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              style={{
                                background: `${blightColor(prop.blight_score || 0)}1A`,
                                color: blightColor(prop.blight_score || 0),
                                fontFamily: 'Syne',
                              }}
                            >
                              {blightLabel(prop.blight_score || 0)}
                            </span>
                            <span className="text-xs" style={{ fontFamily: 'JetBrains Mono', color: blightColor(prop.blight_score || 0) }}>
                              {prop.blight_score || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs truncate max-w-[120px]" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                            {prop.category || '-'}
                          </p>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: '1px solid rgba(177,59,255,0.1)', background: 'rgba(45,11,94,0.15)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  {(page * PAGE_SIZE + 1).toLocaleString()}-{Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg cursor-pointer transition-colors duration-150 disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    style={{ background: 'rgba(177,59,255,0.1)', color: 'var(--electric)' }}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                  </button>
                  <span className="text-xs px-2" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg cursor-pointer transition-colors duration-150 disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    style={{ background: 'rgba(177,59,255,0.1)', color: 'var(--electric)' }}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          <div className="h-12" />
        </div>
      </div>
    </>
  );
}
