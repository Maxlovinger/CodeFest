'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useInView, AnimatePresence, type MotionValue } from 'framer-motion';
import { ArrowRight, MapPin, Brain, Database, AlertTriangle, Home, TrendingUp, ChevronDown, ClipboardList, Building2, Banknote, Pin, LayoutGrid, Cpu } from 'lucide-react';

/* ─────────────────────────────────────────────
   CANVAS: Star field + shooting stars
───────────────────────────────────────────── */
function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0, raf = 0;

    type Star = { x: number; y: number; r: number; a: number; sp: number };
    type Shoot = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };

    let stars: Star[] = [];
    const shoots: Shoot[] = [];
    let nextShoot = 0;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      stars = Array.from({ length: 260 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.8 + 0.15,
        sp: Math.random() * 3 + 0.5,
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // Stars
      stars.forEach(s => {
        const flicker = 0.45 + 0.55 * Math.sin(t * 0.001 * s.sp + s.x * 0.01);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a * flicker})`;
        ctx.fill();
      });

      // Spawn shooting star
      if (t > nextShoot) {
        shoots.push({
          x: Math.random() * W * 0.7 + W * 0.1,
          y: Math.random() * H * 0.45,
          vx: 5 + Math.random() * 4,
          vy: 2.5 + Math.random() * 2,
          life: 0, maxLife: 55 + Math.random() * 30,
        });
        nextShoot = t + 1600 + Math.random() * 2800;
      }

      // Draw shooting stars
      for (let i = shoots.length - 1; i >= 0; i--) {
        const s = shoots[i];
        const prog = s.life / s.maxLife;
        const alpha = prog < 0.15 ? prog / 0.15 : prog > 0.75 ? (1 - prog) / 0.25 : 1;
        const len = 90 + (1 - prog) * 60;
        const grd = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * len * 0.3, s.y - s.vy * len * 0.3);
        grd.addColorStop(0, `rgba(210,170,255,${0.9 * alpha})`);
        grd.addColorStop(0.5, `rgba(177,59,255,${0.5 * alpha})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * len * 0.3, s.y - s.vy * len * 0.3);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        // Head dot
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
        ctx.fill();
        s.x += s.vx; s.y += s.vy; s.life++;
        if (s.life >= s.maxLife) shoots.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />;
}

/* ─────────────────────────────────────────────
   SKYLINE SVG - Philadelphia silhouette
───────────────────────────────────────────── */
function Skyline({ y }: { y: MotionValue<number> }) {
  return (
    <motion.div className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none" style={{ y }}>
      {/* Ambient haze at base */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(71,19,150,0.14) 0%, transparent 100%)' }} />
      <svg viewBox="0 0 1200 320" className="w-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <linearGradient id="sl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D1480" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#1E0760" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#050015" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="sl-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B13BFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#B13BFF" stopOpacity="0" />
          </linearGradient>
          <filter id="sl-blur"><feGaussianBlur stdDeviation="2.5" /></filter>
          <filter id="win-glow"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Far background - faint distant buildings */}
        <rect x="0" y="230" width="1200" height="90" fill="url(#sl-fill)" opacity="0.3" />
        {[50,120,190,280,400,520,640,750,860,980,1080].map((x,i) => (
          <rect key={i} x={x} y={230 - (i%3)*18 - 12} width={30+i%4*8} height={90+i%3*18} fill="#1A0848" opacity="0.5" />
        ))}

        {/* === MAIN SKYLINE === */}

        {/* 30th St Station - far left neoclassical block */}
        <rect x="30" y="170" width="140" height="150" fill="url(#sl-fill)" />
        <rect x="48" y="148" width="105" height="26" fill="url(#sl-fill)" />
        <rect x="70" y="130" width="62" height="22" fill="url(#sl-fill)" />
        {/* Columns */}
        {[80,96,112,128].map((x,i) => <rect key={i} x={x} y="148" width="5" height="26" fill="#2D0B5E" opacity="0.6" />)}

        {/* Mid-left blocks */}
        <rect x="195" y="195" width="55" height="125" fill="url(#sl-fill)" />
        <rect x="268" y="210" width="48" height="110" fill="url(#sl-fill)" />
        <rect x="333" y="200" width="42" height="120" fill="url(#sl-fill)" />

        {/* CITY HALL - centre-left, dome + tower */}
        <rect x="418" y="165" width="130" height="155" fill="url(#sl-fill)" />
        <rect x="438" y="148" width="92" height="22" fill="url(#sl-fill)" />
        {/* Dome */}
        <ellipse cx="484" cy="148" rx="28" ry="10" fill="#2D0B5E" />
        <rect x="478" y="108" width="12" height="42" fill="url(#sl-fill)" />
        <ellipse cx="484" cy="108" rx="18" ry="7" fill="#3D1480" />
        {/* William Penn spire */}
        <rect x="481" y="58" width="6" height="52" fill="#471396" />
        <polygon points="484,40 487,58 481,58" fill="#FFCC00" opacity="0.85" />
        {/* Penn glow */}
        <circle cx="484" cy="45" r="4" fill="#FFCC00" opacity="0.4" filter="url(#sl-blur)" />

        {/* Buildings between City Hall and Comcast */}
        <rect x="570" y="188" width="50" height="132" fill="url(#sl-fill)" />
        <rect x="636" y="175" width="44" height="145" fill="url(#sl-fill)" />
        <rect x="694" y="160" width="38" height="160" fill="url(#sl-fill)" />

        {/* COMCAST / LIBERTY ONE - tallest, centre-right */}
        <rect x="756" y="75" width="78" height="245" fill="url(#sl-fill)" />
        {/* Spire */}
        <polygon points="795,40 810,76 780,76" fill="#5A1AB8" />
        <rect x="793" y="25" width="4" height="18" fill="#B13BFF" opacity="0.7" />
        {/* Glow at top */}
        <ellipse cx="795" cy="50" rx="18" ry="8" fill="#B13BFF" opacity="0.15" filter="url(#sl-blur)" />
        {/* Facade lines */}
        {[15,30,45,60,75,90,110,130,150,170,190].map((dy,i) => (
          <line key={i} x1="757" y1={75+dy} x2="833" y2={75+dy} stroke="#2D0B5E" strokeWidth="0.6" opacity="0.5" />
        ))}

        {/* Mid-right cluster */}
        <rect x="858" y="182" width="52" height="138" fill="url(#sl-fill)" />
        <rect x="924" y="165" width="46" height="155" fill="url(#sl-fill)" />
        <rect x="984" y="195" width="40" height="125" fill="url(#sl-fill)" />

        {/* Industrial cranes */}
        <line x1="220" y1="195" x2="220" y2="130" stroke="#1A0848" strokeWidth="3" opacity="0.7" />
        <line x1="220" y1="130" x2="270" y2="130" stroke="#1A0848" strokeWidth="2" opacity="0.7" />
        <line x1="265" y1="130" x2="265" y2="158" stroke="#1A0848" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
        <line x1="1000" y1="195" x2="1000" y2="128" stroke="#1A0848" strokeWidth="3" opacity="0.7" />
        <line x1="1000" y1="128" x2="1055" y2="128" stroke="#1A0848" strokeWidth="2" opacity="0.7" />
        <line x1="1050" y1="128" x2="1050" y2="152" stroke="#1A0848" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

        {/* BEN FRANKLIN BRIDGE - far right */}
        <rect x="1085" y="120" width="18" height="200" fill="#2D0B5E" opacity="0.8" />
        <rect x="1142" y="120" width="18" height="200" fill="#2D0B5E" opacity="0.8" />
        <path d="M 1085 125 Q 1130 200 1160 125" stroke="#471396" strokeWidth="2.5" fill="none" opacity="0.7" />
        {[0,7,14,21,28].map((off,i) => (
          <line key={i} x1={1090+off*2} y1="125" x2={1090+off*2} y2={280} stroke="#2D0B5E" strokeWidth="0.6" opacity="0.45" />
        ))}

        {/* Main fill - everything below tops */}
        <rect x="0" y="290" width="1200" height="32" fill="#050015" />

        {/* Top glow edge */}
        <path d="M756,76 L834,76 L834,75 Q795,40 756,75 Z" fill="url(#sl-glow)" opacity="0.4" filter="url(#sl-blur)" />

        {/* === WINDOWS === */}
        {/* City Hall windows */}
        {[[430,185],[445,185],[460,185],[475,185],[430,205],[445,205],[460,205],[475,205],
          [430,225],[445,225],[460,225],[475,225]].map(([x,y],i) => (
          <rect key={`ch-${i}`} x={x} y={y} width="7" height="10" rx="1" fill="#FFCC00" opacity={0.3+Math.sin(i)*0.15} filter="url(#win-glow)" />
        ))}
        {/* Comcast windows */}
        {[100,120,140,160,180,200,220].flatMap((dy,row) =>
          [20,32,44,56].map((dx,col) => (
            <rect key={`cc-${row}-${col}`} x={756+dx} y={76+dy} width="6" height="8" rx="1"
              fill={row % 3 === 0 && col % 2 === 0 ? '#FFCC00' : '#B13BFF'}
              opacity={0.2 + (row+col) % 3 * 0.1} filter="url(#win-glow)" />
          ))
        )}
        {/* Random office windows across skyline */}
        {([[205,210],[215,222],[345,215],[358,228],[580,200],[593,215],[645,185],[658,200],
          [700,175],[712,188],[870,195],[882,208],[935,180],[948,195]] as [number,number][]).map(([x,y],i) => (
          <rect key={`rw-${i}`} x={x} y={y} width="6" height="9" rx="1"
            fill={i%3===0 ? '#FFCC00' : '#B13BFF'} opacity={+(0.27 + Math.abs(Math.sin(i * 1.7)) * 0.18).toFixed(4)} filter="url(#win-glow)" />
        ))}
      </svg>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   METRIC CARD with orbiting light halo
───────────────────────────────────────────── */
const METRICS = [
  { icon: Home,          label: 'Vacant Properties',  raw: 3497,  display: '3,497',  color: '#FF2D55', desc: 'Blighted parcels tracked across all Philadelphia zip codes' },
  { icon: AlertTriangle, label: 'Code Violations',    raw: 4954,  display: '4,954',  color: '#FF6B35', desc: 'Active L&I violations on record, updated daily' },
  { icon: MapPin,        label: 'Neighborhoods',      raw: 159,   display: '159',    color: '#B13BFF', desc: 'All 159 mapped with real-time blight risk scores' },
  { icon: TrendingUp,    label: 'AI Risk Score',      raw: 0,     display: '0-100',  color: '#FFCC00', desc: 'Machine learning blight index per property' },
];

function useCountUp(target: number, active: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active || !target) return;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / 1600, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setV(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, active]);
  return v;
}

function MetricCard({ icon: Icon, label, raw, display, color, desc, i }: typeof METRICS[0] & { i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const count = useCountUp(raw, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.1, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative rounded-2xl p-6 overflow-hidden group cursor-default"
      style={{ background: 'rgba(9,0,48,0.75)', border: `1px solid ${color}28`, backdropFilter: 'blur(16px)' }}
      whileHover={{ y: -5, boxShadow: `0 20px 60px ${color}22` }}
    >
      {/* Orbiting halo */}
      <motion.div
        className="absolute w-16 h-16 rounded-full blur-2xl pointer-events-none"
        style={{ background: `${color}35` }}
        animate={{
          top:  ['8%', '8%',  '72%', '72%', '8%'],
          left: ['8%', '78%', '78%', '8%',  '8%'],
        }}
        transition={{ duration: 9 + i, repeat: Infinity, ease: 'linear' }}
      />
      {/* Hover surface glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 30% 30%, ${color}12 0%, transparent 65%)` }} />

      {/* Scanline texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-2xl"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 4px)' }} />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <Icon size={14} style={{ color }} aria-hidden="true" />
          </div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
            {label}
          </span>
        </div>

        <div className="text-5xl font-black tabular-nums leading-none mb-3"
          style={{ fontFamily: 'Syne, sans-serif', color, textShadow: `0 0 24px ${color}55` }}>
          {raw ? count.toLocaleString() : display}
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans', lineHeight: 1.65 }}>
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────── */
const FEATURES = [
  { icon: MapPin,   title: 'Housing + Signal Maps', body: 'Explore vacant properties, neighborhood risk, and the new connectivity layer in one map-first civic interface built for judges, residents, and field teams.', color: '#B13BFF' },
  { icon: Brain,    title: 'Holmes AI - Civic explainer', body: 'Ask for neighborhood summaries, policy briefs, tract risk explanations, and property-level context with Cloudflare Workers AI streaming through the platform.', color: '#FFCC00' },
  { icon: Database, title: 'Challenge Data Pipeline', body: 'Holmes now ingests housing data, Philadelphia connectivity tracts, public Wi-Fi sites, and Glass Box audit logs so every major section runs on real inputs.', color: '#00E5A0' },
];

function FeatureCard({ icon: Icon, title, body, color, i }: typeof FEATURES[0] & { i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: i * 0.13, duration: 0.5 }}
      className="flex gap-4 p-5 rounded-2xl cursor-default group"
      style={{ background: 'rgba(45,11,94,0.22)', border: '1px solid rgba(177,59,255,0.1)' }}
      whileHover={{ borderColor: `${color}44`, background: 'rgba(45,11,94,0.38)' }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <motion.div className="p-2.5 rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          whileHover={{ boxShadow: `0 0 20px ${color}40` }}>
          <Icon size={18} style={{ color }} aria-hidden="true" />
        </motion.div>
      </div>
      <div>
        <h3 className="text-sm font-bold mb-1.5" style={{ fontFamily: 'Syne, sans-serif', color: 'white' }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.72 }}>{body}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   WORD-BY-WORD TITLE REVEAL
───────────────────────────────────────────── */
function AnimatedTitle() {
  const words1 = ['The', 'Holmes'];
  const words2 = ['Project'];
  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-4 flex-wrap">
        {words1.map((w, i) => (
          <motion.span key={w}
            className="block font-black leading-none tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif', color: 'white', fontSize: 'clamp(3.5rem,9vw,8rem)' }}
            initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.4 + i * 0.14, duration: 0.7, ease: [0.25,0.46,0.45,0.94] }}
          >{w}</motion.span>
        ))}
      </div>
      <div className="flex justify-center">
        {words2.map((w, i) => (
          <motion.span key={w}
            className="block font-black leading-none tracking-tight bg-clip-text"
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 'clamp(3.5rem,9vw,8rem)',
              background: 'linear-gradient(135deg, #B13BFF 0%, #FFCC00 60%, #FF6B35 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 40px rgba(177,59,255,0.5))',
            }}
            initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px) drop-shadow(0 0 40px rgba(177,59,255,0.5))' }}
            transition={{ delay: 0.68, duration: 0.7, ease: [0.25,0.46,0.45,0.94] }}
          >{w}</motion.span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SPINNING COMPASS
───────────────────────────────────────────── */
function Compass({ size = 64 }: { size?: number }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true"
      animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>
      <circle cx="40" cy="40" r="37" stroke="#B13BFF" strokeWidth="1.5" opacity="0.5" />
      <circle cx="40" cy="40" r="28" stroke="#471396" strokeWidth="0.5" opacity="0.3" />
      <polygon points="40,5 44,36 40,40 36,36" fill="#FFCC00" />
      <polygon points="40,75 44,44 40,40 36,44" fill="#471396" />
      <polygon points="5,40 36,44 40,40 36,36" fill="#471396" />
      <polygon points="75,40 44,36 40,40 44,44" fill="#B13BFF" />
      <circle cx="40" cy="40" r="4.5" fill="#FFCC00" />
      <circle cx="40" cy="40" r="2" fill="#050015" />
    </motion.svg>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const skylineY  = useTransform(scrollY, [0, 700], [0, 55]);
  const heroOpacity = useTransform(scrollY, [0, 450], [1, 0]);
  const heroScale   = useTransform(scrollY, [0, 450], [1, 0.97]);

  return (
    <div className="min-h-screen" style={{ background: '#050015', overflowX: 'hidden' }}>
      <StarCanvas />

      {/* ── AMBIENT GLOW POOLS ── */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-0 left-1/3 w-[700px] h-[700px] rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(71,19,150,0.3) 0%, transparent 65%)', transform: 'translate(-50%,-40%)' }} />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(177,59,255,0.15) 0%, transparent 70%)', transform: 'translate(35%,0)' }} />
        <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(255,204,0,0.08) 0%, transparent 70%)', transform: 'translate(-30%,0)' }} />
      </div>

      {/* ── GRID OVERLAY (21st.dev pattern) ── */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.035]" aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(177,59,255,0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(177,59,255,0.8) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, #000 60%, transparent 100%)',
        }} />

      {/* ═══════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════ */}
      <section ref={heroRef} className="relative z-10 min-h-screen flex flex-col">

        {/* Top bar */}
        <motion.header
          className="flex items-center justify-between px-6 sm:px-10 pt-7"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2.5">
            <Compass size={28} />
            <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'Syne', color: 'rgba(255,255,255,0.7)' }}>
              The Holmes Project
            </span>
          </div>
          <motion.div
            className="text-[10px] px-3 py-1.5 rounded-full tracking-[0.15em] uppercase"
            style={{ fontFamily: 'JetBrains Mono', background: 'rgba(177,59,255,0.1)', color: 'var(--electric)', border: '1px solid rgba(177,59,255,0.2)' }}
            animate={{ boxShadow: ['0 0 0px rgba(177,59,255,0.2)', '0 0 16px rgba(177,59,255,0.4)', '0 0 0px rgba(177,59,255,0.2)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Philly Codefest 2026
          </motion.div>
        </motion.header>

        {/* Hero content */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-32 gap-7 relative z-20"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          {/* Orbit rings behind compass */}
          <div className="relative flex items-center justify-center mb-2">
            <motion.div className="absolute rounded-full border opacity-20"
              style={{ width: 140, height: 140, borderColor: '#B13BFF' }}
              animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="absolute rounded-full border opacity-10"
              style={{ width: 200, height: 200, borderColor: '#FFCC00', borderStyle: 'dashed' }}
              animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, duration: 0.8, type: 'spring', stiffness: 120 }}
            >
              <Compass size={72} />
            </motion.div>
          </div>

          {/* Historical badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.45 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(255,204,0,0.07)', border: '1px solid rgba(255,204,0,0.18)' }}
          >
            <span className="text-[10px] tracking-[0.18em] uppercase" style={{ fontFamily: 'Playfair Display', color: '#FFCC00', fontStyle: 'italic' }}>
              Named for Thomas Holme · Surveyor General · 1683
            </span>
          </motion.div>

          <AnimatedTitle />

          <motion.p
            className="text-base sm:text-lg max-w-lg leading-relaxed"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-secondary)', fontStyle: 'italic' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.55 }}
          >
            Mapping Philadelphia&apos;s housing crisis, connectivity blind spots, and AI intervention traces with one public-facing civic intelligence platform.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.5 }}
          >
            <Link href="/map" aria-label="Open the original survey map">
              <motion.button
                className="relative flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold cursor-pointer overflow-hidden min-h-[48px]"
                style={{ fontFamily: 'Syne', background: 'linear-gradient(135deg, #B13BFF 0%, #471396 100%)', color: 'white', letterSpacing: '0.05em', boxShadow: '0 0 36px rgba(177,59,255,0.45), 0 6px 20px rgba(0,0,0,0.4)' }}
                whileHover={{ scale: 1.04, boxShadow: '0 0 56px rgba(177,59,255,0.65), 0 8px 28px rgba(0,0,0,0.5)' }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Shine sweep */}
                <motion.div className="absolute inset-0 opacity-0"
                  style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)' }}
                  whileHover={{ opacity: 1, x: ['−100%', '200%'] }}
                  transition={{ duration: 0.55 }} />
                Open Original Map
                <ArrowRight size={15} />
              </motion.button>
            </Link>
            <Link href="/glass-box" aria-label="Open the Glass Box dashboard">
              <motion.button
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold cursor-pointer min-h-[48px]"
                style={{ fontFamily: 'Syne', color: 'var(--text-secondary)', border: '1px solid rgba(177,59,255,0.22)', background: 'rgba(45,11,94,0.28)', letterSpacing: '0.04em' }}
                whileHover={{ color: 'white', borderColor: 'rgba(177,59,255,0.48)', background: 'rgba(45,11,94,0.48)' }}
                whileTap={{ scale: 0.97 }}
              >
                Open Glass Box
              </motion.button>
            </Link>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            className="flex flex-col items-center gap-1.5 mt-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          >
            <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
              Scroll to explore
            </span>
            <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <ChevronDown size={14} style={{ color: 'var(--electric)', opacity: 0.6 }} />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Philadelphia skyline - parallax */}
        <Skyline y={skylineY} />
        {/* Gradient ground fade */}
        <div className="relative z-20 h-16"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, #050015 100%)' }} />
      </section>

      {/* ═══════════════════════════════════════
          METRICS SECTION
      ═══════════════════════════════════════ */}
      <section className="relative z-10 px-5 sm:px-8 py-24 max-w-6xl mx-auto">
        <motion.div className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <p className="text-[10px] tracking-[0.25em] uppercase mb-3" style={{ fontFamily: 'JetBrains Mono', color: 'var(--electric)' }}>
            The Survey · Live Numbers
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Syne', color: 'white' }}>
            Philadelphia's housing crisis, quantified
          </h2>
          <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
            Real addresses. Real violations. Pulled from six OpenDataPhilly sources and scored by machine intelligence - updated automatically.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map((m, i) => <MetricCard key={m.label} {...m} i={i} />)}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          BLIGHT SCORE EXPLAINER
      ═══════════════════════════════════════ */}
      <section className="relative z-10 px-5 sm:px-8 py-20 max-w-5xl mx-auto">
        <motion.div className="text-center mb-12"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <p className="text-[10px] tracking-[0.25em] uppercase mb-3" style={{ fontFamily: 'JetBrains Mono', color: '#FF6B35' }}>
            The Intelligence Layer
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Syne', color: 'white' }}>
            What is a Blight Score?
          </h2>
          <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
            Every parcel in Philadelphia gets a machine-calculated risk index from 0-100. Here's how we build it.
          </p>
        </motion.div>

        {/* Score scale visual */}
        <motion.div className="relative mb-14 px-4"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
          <div className="relative h-3 rounded-full overflow-hidden"
            style={{ background: 'linear-gradient(to right, #00E5A0 0%, #FFCC00 35%, #FF6B35 65%, #FF2D55 100%)' }} />
          {[
            { pct: '0%',   label: '0',   tier: 'Low',      color: '#00E5A0' },
            { pct: '38%',  label: '40',  tier: 'Medium',   color: '#FFCC00' },
            { pct: '63%',  label: '60',  tier: 'High',     color: '#FF6B35' },
            { pct: '87%',  label: '80',  tier: 'Critical', color: '#FF2D55' },
            { pct: '100%', label: '100', tier: '',         color: 'white' },
          ].map(({ pct, label, tier, color }) => (
            <div key={label} className="absolute top-4 flex flex-col items-center" style={{ left: pct, transform: 'translateX(-50%)' }}>
              <div className="w-px h-2 mt-0.5" style={{ background: color }} />
              <span className="text-[10px] font-bold mt-1" style={{ fontFamily: 'JetBrains Mono', color }}>{label}</span>
              {tier && <span className="text-[9px] mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{tier}</span>}
            </div>
          ))}
        </motion.div>

        {/* Factor grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            { Icon: ClipboardList, weight: '30%', title: 'Code Violations', desc: 'Active L&I violations - structural, electrical, sanitation - weighted by severity and recency.', color: '#FF2D55' },
            { Icon: Building2,     weight: '25%', title: 'Vacancy Status',  desc: 'Confirmed vacant parcels from the Philadelphia Vacant Property database and utility shutoffs.', color: '#FF6B35' },
            { Icon: Banknote,      weight: '20%', title: 'Tax Delinquency', desc: 'Years of unpaid property taxes compound the risk score exponentially past year two.', color: '#FFCC00' },
            { Icon: Pin,           weight: '15%', title: 'Eviction Filings', desc: 'Eviction activity signals instability. High eviction density lifts scores for the whole block.', color: '#B13BFF' },
            { Icon: LayoutGrid,    weight: '10%', title: 'Neighborhood Context', desc: 'Surrounding parcel conditions and historical blight density factor in via spatial clustering.', color: '#00E5A0' },
            { Icon: Cpu,           weight: 'AI',  title: 'ML Composite',   desc: 'All signals are passed through a gradient-boosted model trained on Philadelphia housing outcomes.', color: '#4A9EFF' },
          ] as const).map((factor, i) => (
            <motion.div key={factor.title}
              className="relative rounded-2xl p-5 overflow-hidden"
              style={{ background: 'rgba(45,11,94,0.22)', border: `1px solid ${factor.color}20` }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              whileHover={{ borderColor: `${factor.color}50`, background: 'rgba(45,11,94,0.42)' }}>
              {/* Weight badge */}
              <div className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ fontFamily: 'JetBrains Mono', color: factor.color, background: `${factor.color}15`, border: `1px solid ${factor.color}30` }}>
                {factor.weight}
              </div>
              <div className="p-2 rounded-xl mb-3 w-fit" style={{ background: `${factor.color}15` }}>
                <factor.Icon size={18} style={{ color: factor.color }} aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold mb-2" style={{ fontFamily: 'Syne', color: 'white' }}>{factor.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.7 }}>{factor.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Score interpretation */}
        <motion.div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
          {[
            { range: '0-39', label: 'Low Risk', desc: 'Monitor quarterly', color: '#00E5A0', bg: 'rgba(0,229,160,0.07)' },
            { range: '40-59', label: 'Medium Risk', desc: 'LandCare eligible', color: '#FFCC00', bg: 'rgba(255,204,0,0.07)' },
            { range: '60-79', label: 'High Risk', desc: 'L&I escalation', color: '#FF6B35', bg: 'rgba(255,107,53,0.07)' },
            { range: '80-100', label: 'Critical', desc: 'Conservatorship', color: '#FF2D55', bg: 'rgba(255,45,85,0.07)' },
          ].map(tier => (
            <div key={tier.range} className="rounded-xl p-4 text-center" style={{ background: tier.bg, border: `1px solid ${tier.color}25` }}>
              <div className="text-xl font-black mb-1" style={{ fontFamily: 'JetBrains Mono', color: tier.color }}>{tier.range}</div>
              <div className="text-xs font-bold mb-1" style={{ fontFamily: 'Syne', color: 'white' }}>{tier.label}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>{tier.desc}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════
          ORIGIN STORY
      ═══════════════════════════════════════ */}
      <section className="relative z-10 px-5 sm:px-8 py-16 max-w-4xl mx-auto">
        <motion.div
          className="relative rounded-3xl p-8 md:p-12 overflow-hidden"
          style={{ background: 'rgba(45,11,94,0.28)', border: '1px solid rgba(177,59,255,0.18)' }}
          initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          {/* Scanlines */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none opacity-[0.025]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 5px)' }} />
          {/* Watermark compass */}
          <div className="absolute right-0 top-0 opacity-[0.035] pointer-events-none select-none"
            style={{ transform: 'translate(25%,-20%) scale(1.8)' }}>
            <svg width="320" height="320" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="37" stroke="#B13BFF" strokeWidth="1.5" />
              <polygon points="40,5 44,36 40,40 36,36" fill="#FFCC00" />
              <polygon points="40,75 44,44 40,40 36,44" fill="#471396" />
              <polygon points="5,40 36,44 40,40 36,36" fill="#471396" />
              <polygon points="75,40 44,36 40,40 44,44" fill="#B13BFF" />
            </svg>
          </div>

          <p className="text-[10px] tracking-[0.25em] uppercase mb-3" style={{ fontFamily: 'JetBrains Mono', color: '#FFCC00' }}>
            The Name &amp; Its Meaning
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ fontFamily: 'Syne', color: 'white' }}>
            He mapped our beginning.<br />We map our present.
          </h2>
          <div className="space-y-4 max-w-2xl">
            {[
              'In 1683, Thomas Holme laid a grid across a swampy river peninsula and called it Philadelphia. As William Penn\'s Surveyor General, he didn\'t draw mere lines on parchment - he mapped a future, ensuring the city would grow with intentionality.',
              null, // spacer for inline highlight
              'Three hundred and forty-two years later, that grid still exists - but stretching across it are over 21,000 vacant properties, 4,000+ code violations, and thousands of eviction filings. The city Thomas Holme imagined is in crisis.',
              'The Holmes Project carries his name as both tribute and mission. Every vacant building, every blight score, every eviction filing is a data point in a new survey of the city we inherited.',
            ].filter(Boolean).map((text, i) => (
              <motion.p key={i} className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.8 }}
                initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
                {text}
              </motion.p>
            ))}
          </div>

          <motion.blockquote className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,204,0,0.18)' }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
            <p className="text-base md:text-xl" style={{ fontFamily: 'Playfair Display', color: '#FFCC00', fontStyle: 'italic' }}>
              "Building AI for Philly's Future"
            </p>
            <p className="text-[10px] mt-2 tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
              Philly Codefest 2026 · Submission theme
            </p>
          </motion.blockquote>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════ */}
      <section className="relative z-10 px-5 sm:px-8 py-16 max-w-4xl mx-auto">
        <motion.div className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-[10px] tracking-[0.25em] uppercase mb-2" style={{ fontFamily: 'JetBrains Mono', color: 'var(--electric)' }}>
            The Platform
          </p>
          <h2 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Syne', color: 'white' }}>
            Civic intelligence, end to end
          </h2>
        </motion.div>
        <div className="flex flex-col gap-3">
          {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} i={i} />)}
        </div>
      </section>

      <section className="relative z-10 px-5 sm:px-8 py-12">
        <motion.div
          className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {[
            {
              title: 'Dead Zone Detective',
              body: 'A live Leaflet connectivity map that scores tract-level risk, surfaces equity patterns, and explains local public Wi-Fi fallback in plain English.',
              color: '#7CD9FF',
            },
            {
              title: 'Glass Box',
              body: 'An audit dashboard that parses shared inhibitor logs into timelines, action summaries, and policy-trigger views for non-technical review.',
              color: '#FFCC00',
            },
          ].map(card => (
            <div
              key={card.title}
              className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(45,11,94,0.22)', border: `1px solid ${card.color}22` }}
            >
              <p className="mb-3 text-[10px] uppercase tracking-[0.24em]" style={{ fontFamily: 'JetBrains Mono', color: card.color }}>
                Challenge
              </p>
              <h3 className="mb-2 text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {card.title}
              </h3>
              <p className="text-sm leading-7" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
                {card.body}
              </p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-28 text-center" aria-label="Call to action">
        {/* Glow ring behind CTA */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(177,59,255,0.5) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <motion.div className="relative max-w-lg mx-auto"
          initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}>

          <div className="flex justify-center mb-7">
            <div className="relative">
              <motion.div className="absolute inset-0 rounded-full opacity-30"
                style={{ background: 'rgba(177,59,255,0.4)', filter: 'blur(20px)', transform: 'scale(1.4)' }}
                animate={{ scale: [1.3, 1.6, 1.3], opacity: [0.25, 0.45, 0.25] }}
                transition={{ duration: 3, repeat: Infinity }} />
              <Compass size={80} />
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Syne', color: 'white' }}>
            Begin the Survey
          </h2>
          <p className="text-sm mb-9 leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', lineHeight: 1.75 }}>
            Open the live map. Click any neighborhood. Ask Holmes anything. The data is already there - waiting to be read.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/map" aria-label="Open the survey map">
              <motion.button
                className="flex items-center gap-2.5 px-10 py-4 rounded-2xl text-sm font-bold cursor-pointer min-h-[52px]"
                style={{ fontFamily: 'Syne', background: 'linear-gradient(135deg, #B13BFF 0%, #471396 100%)', color: 'white', letterSpacing: '0.06em', boxShadow: '0 0 40px rgba(177,59,255,0.45), 0 8px 32px rgba(0,0,0,0.4)' }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 64px rgba(177,59,255,0.65), 0 10px 40px rgba(0,0,0,0.5)' }}
                whileTap={{ scale: 0.97 }}
              >
                Open Survey Map
                <ArrowRight size={16} />
              </motion.button>
            </Link>
            <Link href="/policy" aria-label="Generate policy brief">
              <motion.button
                className="flex items-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold cursor-pointer min-h-[52px]"
                style={{ fontFamily: 'Syne', color: 'var(--text-secondary)', border: '1px solid rgba(177,59,255,0.22)', background: 'rgba(45,11,94,0.28)', letterSpacing: '0.04em' }}
                whileHover={{ color: 'white', borderColor: 'rgba(177,59,255,0.48)' }}
                whileTap={{ scale: 0.97 }}
              >
                Generate Policy Brief
              </motion.button>
            </Link>
          </div>

          <p className="mt-10 text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'Playfair Display', fontStyle: 'italic' }}>
            The Holmes Project · Philadelphia · 2026
          </p>
        </motion.div>
      </section>
    </div>
  );
}
