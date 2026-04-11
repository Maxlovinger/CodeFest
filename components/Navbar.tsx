'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, MapPin, Menu, X } from 'lucide-react';

interface NavbarProps {
  onAddressSelect?: (address: string, lat: number, lng: number) => void;
  lastIngestion?: string;
}

const NAV_LINKS = [
  { href: '/map', label: 'Map' },
  { href: '/signal', label: 'Dead Zone' },
  { href: '/community', label: 'Community' },
  { href: '/data', label: 'Data' },
  { href: '/insights', label: 'Insights' },
  { href: '/policy', label: 'Policy' },
  { href: '/about', label: 'About' },
];

function CompassLogo() {
  return (
    <motion.svg
      width="36" height="36"
      viewBox="0 0 80 80"
      fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="37" stroke="#B13BFF" strokeWidth="1.5" opacity="0.5" />
      <circle cx="40" cy="40" r="28" stroke="#471396" strokeWidth="0.5" opacity="0.3" />
      {/* N - gold */}
      <polygon points="40,5 44,36 40,40 36,36" fill="#FFCC00" />
      {/* S - royal */}
      <polygon points="40,75 44,44 40,40 36,44" fill="#471396" />
      {/* W - royal */}
      <polygon points="5,40 36,44 40,40 36,36" fill="#471396" />
      {/* E - electric */}
      <polygon points="75,40 44,36 40,40 44,44" fill="#B13BFF" />
      <circle cx="40" cy="40" r="4" fill="#FFCC00" />
      <circle cx="40" cy="40" r="2" fill="#090040" />
      <defs>
        <linearGradient id="nav-cg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B13BFF" />
          <stop offset="100%" stopColor="#FFCC00" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

export default function Navbar({ onAddressSelect, lastIngestion }: NavbarProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDataFresh = lastIngestion && (Date.now() - new Date(lastIngestion).getTime()) < 24 * 60 * 60 * 1000;

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length <= 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ', Philadelphia, PA')}&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      const mapped = results.map((r: { display_name: string; lat: string; lon: string }) => ({
        label: r.display_name.replace(/, United States$/, ''),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }));
      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch { setSuggestions([]); setShowSuggestions(false); }
    }, 350);
  };

  const handleSelectSuggestion = (s: { label: string; lat: number; lng: number }) => {
    setSearch(s.label);
    setShowSuggestions(false);
    if (onAddressSelect) onAddressSelect(s.label, s.lat, s.lng);
  };

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-30 px-4 py-3"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="relative flex items-center gap-3 px-4 h-14 rounded-2xl"
            style={{
              background: 'rgba(9,0,64,0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(177,59,255,0.22)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(177,59,255,0.08) inset',
            }}
          >
            {/* Gradient sheen */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(177,59,255,0.06) 0%, rgba(255,204,0,0.03) 100%)' }}
            />

            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group" aria-label="Home">
              <CompassLogo />
              <div className="hidden sm:block leading-tight">
                <span className="block text-sm font-bold tracking-tight text-white transition-colors group-hover:text-electric" style={{ fontFamily: 'Syne, sans-serif' }}>
                  The Holmes Project
                </span>
                <span className="block text-[9px] tracking-widest" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Signal Intelligence · Philadelphia
                </span>
              </div>
            </Link>

            {/* Nav links - desktop */}
            <div className="hidden lg:flex items-center gap-0.5 ml-1">
              {NAV_LINKS.map(link => {
                const active = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <motion.div
                      className="relative px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors duration-150"
                      style={{
                        fontFamily: 'Syne, sans-serif',
                        color: active ? 'white' : 'var(--text-secondary)',
                        letterSpacing: '0.04em',
                      }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {active && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: 'linear-gradient(135deg, rgba(177,59,255,0.25) 0%, rgba(71,19,150,0.3) 100%)',
                            border: '1px solid rgba(177,59,255,0.35)',
                          }}
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <span className="relative z-10">{link.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Search - grows to fill middle */}
            <div className="flex-1 max-w-xs mx-2 hidden md:block" ref={searchRef}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--electric)' }} aria-hidden="true" />
                <label htmlFor="nav-search" className="sr-only">Search Philadelphia address</label>
                <input
                  id="nav-search"
                  type="search"
                  placeholder="Search Philadelphia..."
                  value={search}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  autoComplete="off"
                  className="w-full h-8 rounded-xl pl-8 pr-3 text-xs outline-none cursor-text"
                  style={{
                    background: 'rgba(45,11,94,0.6)',
                    border: '1px solid rgba(177,59,255,0.18)',
                    color: 'var(--text-primary)',
                    fontFamily: 'DM Sans, sans-serif',
                    caretColor: 'var(--electric)',
                  }}
                  aria-label="Search address"
                />
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-10 left-0 right-0 rounded-xl overflow-hidden z-50"
                      style={{
                        background: 'rgba(9,0,64,0.97)',
                        border: '1px solid rgba(177,59,255,0.3)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                      }}
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer transition-colors duration-100 hover:bg-electric/10"
                          style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(177,59,255,0.08)' : 'none' }}
                          onMouseDown={() => handleSelectSuggestion(s)}
                        >
                          <MapPin size={11} style={{ color: 'var(--electric)', flexShrink: 0 }} aria-hidden="true" />
                          <span className="text-xs truncate" style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)' }}>
                            {s.label}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right: status + AI badge + mobile menu */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              <Link
                href="/glass-box"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,204,0,0.16) 0%, rgba(177,59,255,0.14) 100%)',
                  border: '1px solid rgba(255,204,0,0.24)',
                  color: 'white',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                }}
              >
                Glass Box
              </Link>

              <Link
                href="/signal/map"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,217,255,0.16) 0%, rgba(177,59,255,0.14) 100%)',
                  border: '1px solid rgba(124,217,255,0.24)',
                  color: 'white',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                }}
              >
                Dead Zone Map
              </Link>

              {/* Live status */}
              <motion.div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: isDataFresh ? 'rgba(0,229,160,0.12)' : 'rgba(255,204,0,0.12)',
                  border: `1px solid ${isDataFresh ? 'rgba(0,229,160,0.3)' : 'rgba(255,204,0,0.3)'}`,
                }}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isDataFresh ? '#00E5A0' : '#FFCC00' }}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-[10px] font-semibold" style={{ color: isDataFresh ? '#00E5A0' : '#FFCC00', fontFamily: 'JetBrains Mono' }}>
                  {isDataFresh ? 'LIVE' : 'CACHE'}
                </span>
              </motion.div>

              {/* Holmes AI badge */}
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(177,59,255,0.18) 0%, rgba(71,19,150,0.25) 100%)',
                  border: '1px solid rgba(177,59,255,0.3)',
                }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 16px rgba(177,59,255,0.4)' }}
                whileTap={{ scale: 0.97 }}
              >
                <Sparkles size={11} style={{ color: '#FFCC00' }} aria-hidden="true" />
                <span className="hidden sm:block text-[10px] font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}>
                  Holmes AI
                </span>
              </motion.div>

              {/* Mobile menu toggle */}
              <motion.button
                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer"
                style={{ background: 'rgba(177,59,255,0.1)', border: '1px solid rgba(177,59,255,0.2)' }}
                onClick={() => setMenuOpen(!menuOpen)}
                whileTap={{ scale: 0.93 }}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                <AnimatePresence mode="wait">
                  {menuOpen
                    ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X size={14} style={{ color: 'var(--electric)' }} /></motion.div>
                    : <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu size={14} style={{ color: 'var(--electric)' }} /></motion.div>
                  }
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden mt-2 rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(9,0,64,0.97)',
                  border: '1px solid rgba(177,59,255,0.22)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Mobile search */}
                <div className="p-3 border-b" style={{ borderColor: 'rgba(177,59,255,0.1)' }}>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--electric)' }} aria-hidden="true" />
                    <input
                      type="search"
                      placeholder="Search Philadelphia..."
                      value={search}
                      onChange={e => handleSearchChange(e.target.value)}
                      autoComplete="off"
                      className="w-full h-9 rounded-xl pl-8 pr-3 text-xs outline-none"
                      style={{ background: 'rgba(45,11,94,0.6)', border: '1px solid rgba(177,59,255,0.18)', color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                      aria-label="Search address"
                    />
                  </div>
                  {/* Mobile suggestions */}
                  {suggestions.length > 0 && (
                    <div className="mt-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(177,59,255,0.2)', background: 'rgba(9,0,64,0.98)' }}>
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer transition-colors duration-100 hover:bg-electric/10"
                          style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(177,59,255,0.08)' : 'none' }}
                          onMouseDown={() => { handleSelectSuggestion(s); setMenuOpen(false); }}
                        >
                          <MapPin size={11} style={{ color: 'var(--electric)', flexShrink: 0 }} aria-hidden="true" />
                          <span className="text-xs truncate" style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)' }}>
                            {s.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {NAV_LINKS.map((link, i) => {
                  const active = pathname === link.href;
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                      <div
                        className="flex items-center px-4 py-3 cursor-pointer transition-colors duration-150"
                        style={{
                          background: active ? 'rgba(177,59,255,0.12)' : 'transparent',
                          borderBottom: i < NAV_LINKS.length - 1 ? '1px solid rgba(177,59,255,0.06)' : 'none',
                          color: active ? 'white' : 'var(--text-secondary)',
                          fontFamily: 'Syne, sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {active && <div className="w-1 h-4 rounded-full mr-3 flex-shrink-0" style={{ background: 'var(--electric)' }} />}
                        {link.label}
                      </div>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Offset spacer so map page content isn't clipped - map page uses its own layout so this only affects secondary pages via pt-14 on their wrappers */}
    </>
  );
}
