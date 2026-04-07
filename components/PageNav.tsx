'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const NAV_LINKS = [
  { href: '/', label: 'Map' },
  { href: '/insights', label: 'Insights' },
  { href: '/policy', label: 'Policy' },
  { href: '/data', label: 'Data' },
  { href: '/about', label: 'About' },
];

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

export default function PageNav() {
  const pathname = usePathname();

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-5 h-14"
      style={{
        background: 'rgba(9,0,64,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(177,59,255,0.18)',
      }}
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-2.5 flex-shrink-0 group cursor-pointer"
        aria-label="The Holmes Project — Home"
      >
        <CompassMark />
        <div className="leading-tight">
          <span
            className="block text-sm font-bold tracking-tight transition-colors duration-150 group-hover:text-electric"
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

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(177,59,255,0.25)' }} />

      {/* Nav links */}
      <div className="flex items-center gap-0.5">
        {NAV_LINKS.map(link => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer"
              style={{
                fontFamily: 'Syne, sans-serif',
                color: active ? 'white' : 'var(--text-secondary)',
                background: active ? 'rgba(177,59,255,0.18)' : 'transparent',
                letterSpacing: '0.03em',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.color = 'white';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              {link.label}
              {active && (
                <motion.div
                  className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                  style={{ background: 'var(--electric)' }}
                  layoutId="nav-underline"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Live indicator */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#00E5A0' }}
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <span className="text-[10px] hidden sm:block" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
          Live Data
        </span>
      </div>
    </motion.nav>
  );
}
