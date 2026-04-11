'use client';

import { motion } from 'framer-motion';
import PageNav from '@/components/PageNav';
import { Heart, Users, Home as HomeIcon, Wifi, Shield, MessageCircle } from 'lucide-react';

const COMMUNITY_IMPACTS = [
  {
    icon: HomeIcon,
    title: 'Housing Stability',
    stat: '1 in 8',
    detail: 'Philadelphia children living in blighted neighborhoods',
    description: 'Blight and displacement go hand in hand. As neighborhoods deteriorate, long-term residents are pushed out by deteriorating conditions - then priced out when speculative investment eventually arrives.',
    color: '#FF6B35',
  },
  {
    icon: Wifi,
    title: 'Digital Equity',
    stat: '160+',
    detail: 'Census tracts tracked for connectivity risk',
    description: 'The neighborhoods hit hardest by vacant properties and housing blight are the same ones losing the connectivity battle. It is not a coincidence - it is the same disinvestment showing up in two different datasets.',
    color: '#7CD9FF',
  },
  {
    icon: Users,
    title: 'Community Empowerment',
    stat: '21K+',
    detail: 'Properties tracked and accessible to organizers',
    description: 'Data-driven tools exist to open the window wider for community-centered intervention. The policy brief generator turns data into actionable recommendations for community organizers, city planners, and anyone who needs to make the case for intervention.',
    color: '#FFCC00',
  },
];

const STAKEHOLDERS = [
  { label: 'Residents', desc: 'People directly affected by housing and connectivity crises' },
  { label: 'Community Organizers', desc: 'Grassroots leaders advocating for their neighborhoods' },
  { label: 'Nonprofit Organizations', desc: 'Service providers and community development groups' },
  { label: 'City Agencies', desc: 'Municipal departments working on housing and digital access' },
  { label: 'Field Teams', desc: 'On-the-ground workers who need actionable data' },
  { label: 'Policy Makers', desc: 'Decision-makers shaping interventions' },
];

export default function CommunityPage() {
  return (
    <>
      <PageNav />

      <div className="min-h-screen pt-20" style={{ background: 'var(--void)' }}>
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(255,107,53,0.12) 0%, transparent 45%), radial-gradient(circle at 70% 60%, rgba(124,217,255,0.08) 0%, transparent 40%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl px-5 py-10">
          {/* Hero */}
          <motion.section
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 flex justify-center">
              <motion.div
                className="rounded-full p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(124,217,255,0.12) 100%)',
                  border: '1px solid rgba(255,107,53,0.2)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(255,107,53,0.2)',
                    '0 0 40px rgba(124,217,255,0.3)',
                    '0 0 20px rgba(255,107,53,0.2)',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Heart size={48} style={{ color: '#FF6B35' }} />
              </motion.div>
            </div>

            <p className="mb-3 text-[10px] uppercase tracking-[0.28em]" style={{ color: '#FF6B35', fontFamily: 'Syne, sans-serif' }}>
              Culture &amp; Community Innovation Award
            </p>
            <h1 className="mx-auto mb-4 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
              Strengthening Community Through Shared Data
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'DM Sans, sans-serif' }}>
              The Holmes Project brings people together around a shared understanding of Philadelphia&apos;s housing and connectivity crises. By making complex civic data accessible, explainable, and actionable, we empower communities to advocate for themselves and plan their own futures.
            </p>
          </motion.section>

          {/* Mission Statement */}
          <motion.section
            className="mb-12 rounded-[30px] p-8"
            style={{
              background: 'linear-gradient(145deg, rgba(255,107,53,0.08) 0%, rgba(124,217,255,0.06) 100%)',
              border: '1px solid rgba(255,107,53,0.18)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <MessageCircle size={20} style={{ color: '#FFCC00' }} />
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Our Community Mission
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.75 }}>
                Philadelphia has thousands of vacant, blighted properties and entire neighborhoods without reliable internet access. Both crises are well-documented and the data exists, but it&apos;s scattered across city databases and impossible to act on without the right tools to make sense of it.
              </p>
              <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.75 }}>
                <strong style={{ color: '#FFCC00' }}>The window for community-centered intervention is narrow.</strong> As neighborhoods deteriorate, long-term residents are pushed out by deteriorating conditions - then priced out when speculative investment eventually arrives. Data-driven tools like this platform exist to <strong style={{ color: '#FFCC00' }}>open that window wider</strong>.
              </p>
              <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.75 }}>
                The goal is to put the same quality of civic intelligence that developers and consultants take for granted into the hands of the city agencies, nonprofits, and community organizations who actually need it.
              </p>
            </div>
          </motion.section>

          {/* Community Impact Cards */}
          <motion.section
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="mb-6 text-center text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Community Impact
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {COMMUNITY_IMPACTS.map((impact, index) => (
                <motion.div
                  key={impact.title}
                  className="rounded-[24px] p-6"
                  style={{
                    background: 'rgba(45,11,94,0.28)',
                    border: `1px solid ${impact.color}30`,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                  whileHover={{ borderColor: `${impact.color}60`, background: 'rgba(45,11,94,0.42)' }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="rounded-xl p-3" style={{ background: `${impact.color}15` }}>
                      <impact.icon size={24} style={{ color: impact.color }} />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: impact.color }}>
                        {impact.stat}
                      </div>
                      <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {impact.detail}
                      </div>
                    </div>
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {impact.title}
                  </h3>
                  <p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7 }}>
                    {impact.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Shared Cultural Narrative */}
          <motion.section
            className="mb-12 rounded-[30px] p-8"
            style={{
              background: 'rgba(45,11,94,0.28)',
              border: '1px solid rgba(177,59,255,0.18)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <Shield size={20} style={{ color: '#B13BFF' }} />
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                A Shared Cultural Narrative
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-base" style={{ fontFamily: 'Playfair Display, serif', color: '#FFCC00', fontStyle: 'italic' }}>
                &quot;He mapped our beginning. We map our present.&quot;
              </p>
              <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.75 }}>
                In 1683, Thomas Holme laid a grid across a swampy river peninsula and called it Philadelphia. As William Penn&apos;s Surveyor General, he didn&apos;t draw mere lines on parchment - he mapped a future, ensuring the city would grow with intentionality.
              </p>
              <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.75 }}>
                The Holmes Project carries his name as both tribute and mission. Just as Holme mapped Philadelphia&apos;s future in 1683, we map the city&apos;s modern stress signals so Philadelphia can plan its next chapter. This creates a <strong style={{ color: '#B13BFF' }}>shared cultural narrative</strong> connecting Philadelphia&apos;s founding vision with contemporary civic responsibility.
              </p>
              <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.75 }}>
                We position residents as participants in a 340-year conversation about equitable city design - framing the housing crisis not as inevitability, but as a breakdown of civic intention that can be repaired.
              </p>
            </div>
          </motion.section>

          {/* Multi-Stakeholder Platform */}
          <motion.section
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <h2 className="mb-6 text-center text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Built for All Stakeholders
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {STAKEHOLDERS.map((stakeholder, index) => (
                <motion.div
                  key={stakeholder.label}
                  className="flex items-start gap-3 rounded-[20px] p-4"
                  style={{
                    background: 'rgba(45,11,94,0.22)',
                    border: '1px solid rgba(177,59,255,0.12)',
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.05, duration: 0.3 }}
                >
                  <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: '#7CD9FF' }} />
                  <div>
                    <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {stakeholder.label}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'DM Sans, sans-serif' }}>
                      {stakeholder.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Sans, sans-serif' }}>
              Holmes creates shared visual language and collaborative infrastructure where all stakeholders can work together toward collective growth.
            </p>
          </motion.section>

          {/* Equity and Accessibility */}
          <motion.section
            className="mb-12 rounded-[30px] p-8"
            style={{
              background: 'linear-gradient(145deg, rgba(124,217,255,0.08) 0%, rgba(177,59,255,0.06) 100%)',
              border: '1px solid rgba(124,217,255,0.18)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <Users size={20} style={{ color: '#7CD9FF' }} />
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Reflecting &amp; Uplifting All Experiences
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#FFCC00' }}>
                  The &quot;Double Burden&quot; Pattern
                </h3>
                <p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7 }}>
                  Holmes explicitly surfaces systemic inequity patterns by showing how communities face compounding disadvantages across both housing AND connectivity access. The same disinvestment shows up in two different datasets.
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#FFCC00' }}>
                  Accessible to Everyone
                </h3>
                <p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7 }}>
                  Complex housing and connectivity data is translated into plain language so communities can understand and act on it without requiring technical expertise. Holmes speaks like a knowledgeable friend, not a bureaucrat.
                </p>
              </div>
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <div
              className="mx-auto max-w-2xl rounded-[28px] p-8"
              style={{
                background: 'linear-gradient(145deg, rgba(255,107,53,0.12) 0%, rgba(177,59,255,0.08) 100%)',
                border: '1px solid rgba(255,107,53,0.2)',
              }}
            >
              <h2 className="mb-4 text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Collaboration, Belonging &amp; Collective Growth
              </h2>
              <p className="mb-6 text-sm leading-7" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.75 }}>
                The Holmes Project operates at the intersection of data science, civic responsibility, and community empowerment. By making the invisible visible, we create environments where communities can thrive together.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'JetBrains Mono, monospace' }}>
                <span>Community Connection</span>
                <span style={{ color: '#FF6B35' }}>◈</span>
                <span>Shared Culture</span>
                <span style={{ color: '#FF6B35' }}>◈</span>
                <span>Collective Empowerment</span>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  );
}
