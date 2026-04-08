'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const NAV_LINKS = [
  { href: '/map', label: 'Map' },
  { href: '/insights', label: 'Insights' },
  { href: '/policy', label: 'Policy' },
  { href: '/data', label: 'Data' },
  { href: '/about', label: 'About' },
];

function CompassLogo() {
  return (
    <motion.svg
      width="32" height="32" viewBox="0 0 80 80" fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="37" stroke="#B13BFF" strokeWidth="1.5" opacity="0.5" />
      <polygon points="40,5 44,36 40,40 36,36" fill="#FFCC00" />
      <polygon points="40,75 44,44 40,40 36,44" fill="#471396" />
      <polygon points="5,40 36,44 40,40 36,36" fill="#471396" />
      <polygon points="75,40 44,36 40,40 44,44" fill="#B13BFF" />
      <circle cx="40" cy="40" r="4" fill="#FFCC00" />
      <circle cx="40" cy="40" r="2" fill="#090040" />
    </motion.svg>
  );
}

export default function PageNav() {
  const pathname = usePathname();

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-40 px-4 py-3"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="max-w-7xl mx-auto">
        <div
          className="relative flex items-center gap-3 px-4 h-14 rounded-2xl"
          style={{
            background: 'rgba(9,0,64,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(177,59,255,0.22)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(177,59,255,0.08) inset',
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(177,59,255,0.06) 0%, rgba(255,204,0,0.03) 100%)' }}
          />

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group cursor-pointer" aria-label="Home">
            <CompassLogo />
            <div className="hidden sm:block leading-tight">
              <span className="block text-sm font-bold tracking-tight text-white transition-colors group-hover:text-electric" style={{ fontFamily: 'Syne, sans-serif' }}>
                The Holmes Project
              </span>
              <span className="block text-[9px] tracking-widest" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                1683 · Philadelphia
              </span>
            </div>
          </Link>

          {/* Divider */}
          <div className="w-px h-5 flex-shrink-0 hidden sm:block" style={{ background: 'rgba(177,59,255,0.25)' }} />

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
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
                        layoutId="page-nav-pill"
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

          {/* Right — live dot */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
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
        </div>
      </div>
    </motion.nav>
  );
}
