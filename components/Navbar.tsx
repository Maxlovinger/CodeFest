'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Zap } from 'lucide-react';
import { importLibrary } from '@/lib/maps';

interface NavbarProps {
  onAddressSelect?: (address: string, lat: number, lng: number) => void;
  lastIngestion?: string;
}

function CompassMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 80 80" className="animate-spin-slow flex-shrink-0" aria-hidden="true">
      <circle cx="40" cy="40" r="37" stroke="#B13BFF" strokeWidth="1.5" fill="none" opacity="0.5" />
      <polygon points="40,5 44,36 40,40 36,36" fill="#FFCC00" />
      <polygon points="40,75 44,44 40,40 36,44" fill="#471396" />
      <polygon points="5,40 36,44 40,40 36,36" fill="#471396" />
      <polygon points="75,40 44,36 40,40 44,44" fill="#B13BFF" />
      <circle cx="40" cy="40" r="4" fill="#FFCC00" />
      <circle cx="40" cy="40" r="2" fill="#090040" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: '/', label: 'Map' },
  { href: '/insights', label: 'Insights' },
  { href: '/policy', label: 'Policy' },
  { href: '/data', label: 'Data' },
  { href: '/about', label: 'About' },
];

export default function Navbar({ onAddressSelect, lastIngestion }: NavbarProps) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pathname = usePathname();
  const isDataFresh = lastIngestion && (Date.now() - new Date(lastIngestion).getTime()) < 24 * 60 * 60 * 1000;

  const handleSearchChange = async (val: string) => {
    setSearch(val);
    if (val.length <= 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      await importLibrary('places');
      const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: val,
        includedRegionCodes: ['us'],
      });
      const filtered = results.filter(s => s.placePrediction != null).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    const pred = suggestion.placePrediction!;
    setSearch(pred.text.text);
    setShowSuggestions(false);

    if (!onAddressSelect) return;
    try {
      const place = pred.toPlace();
      await place.fetchFields({ fields: ['location', 'displayName'] });
      if (place.location) {
        onAddressSelect(pred.text.text, place.location.lat(), place.location.lng());
      }
    } catch {
      // silently fail — user still sees the typed address
    }
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14"
      style={{
        background: 'rgba(9,0,64,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(177,59,255,0.18)',
      }}
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0 cursor-pointer group" aria-label="Home">
        <CompassMark />
        <div className="leading-tight">
          <span
            className="block text-sm font-bold tracking-tight transition-colors duration-150 group-hover:text-white"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
          >
            The Holmes Project
          </span>
          <span
            className="block text-[9px] tracking-widest"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-muted)', fontStyle: 'italic' }}
          >
            1683 · Philadelphia
          </span>
        </div>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-0.5 ml-1">
        {NAV_LINKS.map(link => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150"
              style={{
                fontFamily: 'Syne, sans-serif',
                color: active ? 'white' : 'var(--text-secondary)',
                background: active ? 'rgba(177,59,255,0.18)' : 'transparent',
                letterSpacing: '0.03em',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm relative mx-auto">
        <div
          className="flex items-center gap-2 px-3 h-8 rounded-lg"
          style={{
            background: 'rgba(45,11,94,0.7)',
            border: '1px solid rgba(177,59,255,0.2)',
          }}
        >
          <Search size={12} style={{ color: 'var(--electric)', flexShrink: 0 }} aria-hidden="true" />
          <label htmlFor="navbar-search" className="sr-only">Search Philadelphia address</label>
          <input
            id="navbar-search"
            type="search"
            placeholder="Search Philadelphia address..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="flex-1 bg-transparent outline-none text-xs cursor-text"
            style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-primary)', caretColor: 'var(--electric)' }}
            aria-label="Search address"
            autoComplete="off"
          />
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div
            className="absolute top-10 left-0 right-0 rounded-lg overflow-hidden z-50"
            style={{
              background: 'rgba(9,0,64,0.97)',
              border: '1px solid rgba(177,59,255,0.3)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {suggestions.map(s => (
              <button
                key={s.placePrediction?.placeId}
                className="w-full px-3 py-2.5 text-left text-xs cursor-pointer transition-colors duration-100 hover:bg-electric/10"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid rgba(177,59,255,0.08)',
                }}
                onMouseDown={() => handleSelectSuggestion(s)}
              >
                {s.placePrediction?.text.text}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isDataFresh ? '#00E5A0' : '#FFCC00' }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[10px] hidden sm:block" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            {isDataFresh ? 'Live' : 'Cached'}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ background: 'rgba(177,59,255,0.1)', border: '1px solid rgba(177,59,255,0.15)' }}
        >
          <Zap size={11} style={{ color: 'var(--electric)' }} aria-hidden="true" />
          <span className="text-[10px] font-semibold hidden sm:block" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--electric)' }}>
            Holmes AI
          </span>
        </div>
      </div>
    </motion.nav>
  );
}
