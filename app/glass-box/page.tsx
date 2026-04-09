'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRightLeft,
  BadgeCheck,
  BookLock,
  Clock3,
  Eye,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import PageNav from '@/components/PageNav';
import DataIngestButton from '@/components/DataIngestButton';

interface AuditSummary {
  total_events: string;
  blocked: string;
  interrupted: string;
  escalated: string;
  high_severity: string;
  last_event: string;
}

interface ActionCount {
  action: string;
  count: string;
}

interface PolicyCount {
  policy_trigger: string;
  count: string;
}

interface SelectedSurface {
  kind: 'action' | 'policy';
  label: string;
  count: string;
}

interface AuditEvent {
  source: string;
  event_timestamp: string;
  request_id: string;
  api_key: string;
  agent_id: string;
  mode: string;
  event_type: string;
  severity: string;
  action: string;
  policy_trigger: string;
  reason: string;
  proposed_action: string;
  corrected_action: string;
  meta?: Record<string, unknown>;
}

function eventTone(action?: string, severity?: string) {
  if (action === 'blocked') return '#FF2D55';
  if (action === 'escalated') return '#FFCC00';
  if (severity === 'high') return '#FF6B35';
  return '#7CD9FF';
}

function formatDate(value?: string) {
  if (!value) return 'No events yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No events yet';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function shortReason(event: AuditEvent) {
  return (
    event.reason ||
    event.corrected_action ||
    event.proposed_action ||
    event.policy_trigger ||
    event.event_type ||
    'No reviewer note attached yet.'
  );
}

export default function GlassBoxPage() {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [actions, setActions] = useState<ActionCount[]>([]);
  const [policies, setPolicies] = useState<PolicyCount[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [eventBrief, setEventBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [selectedSurface, setSelectedSurface] = useState<SelectedSurface | null>(null);
  const [surfaceBrief, setSurfaceBrief] = useState('');
  const [surfaceLoading, setSurfaceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAudit() {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, eventsRes] = await Promise.all([
        fetch('/api/audit/summary', { cache: 'no-store' }),
        fetch('/api/audit/events?limit=8', { cache: 'no-store' }),
      ]);

      const summaryData = await summaryRes.json();
      const eventsData = await eventsRes.json();

      if (!summaryRes.ok) throw new Error(summaryData?.error || 'Unable to load audit summary');
      if (!eventsRes.ok) throw new Error(eventsData?.error || 'Unable to load audit events');

      setSummary(summaryData.summary ?? null);
      setActions(summaryData.actions ?? []);
      setPolicies(summaryData.policies ?? []);
      const nextEvents = eventsData.events ?? [];
      setEvents(nextEvents);
      if (!selectedEvent && nextEvents.length) {
        setSelectedEvent(nextEvents[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load audit data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudit();
  }, []);

  useEffect(() => {
    if (!selectedEvent || loading) {
      setEventBrief('');
      setBriefLoading(false);
      return;
    }

    let cancelled = false;
    setBriefLoading(true);
    setEventBrief('');

    (async () => {
      try {
        const res = await fetch('/api/ai/audit-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: selectedEvent }),
        });

        if (!res.ok) {
          const message = (await res.text()) || 'Holmes could not explain this event right now.';
          if (!cancelled) setEventBrief(message);
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
          setEventBrief(accumulated);
        }
      } catch {
        if (!cancelled) setEventBrief('Holmes could not explain this event right now.');
      } finally {
        if (!cancelled) setBriefLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent, loading]);

  useEffect(() => {
    if (!selectedSurface || loading) {
      setSurfaceBrief('');
      setSurfaceLoading(false);
      return;
    }

    let cancelled = false;
    setSurfaceLoading(true);
    setSurfaceBrief('');

    (async () => {
      try {
        const res = await fetch('/api/ai/audit-surface-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: selectedSurface.kind,
            label: selectedSurface.label,
            count: selectedSurface.count,
            total: summary?.total_events || 'unknown',
          }),
        });

        if (!res.ok) {
          const message = (await res.text()) || 'Holmes could not explain this summary item right now.';
          if (!cancelled) setSurfaceBrief(message);
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
          setSurfaceBrief(accumulated);
        }
      } catch {
        if (!cancelled) setSurfaceBrief('Holmes could not explain this summary item right now.');
      } finally {
        if (!cancelled) setSurfaceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSurface, summary?.total_events, loading]);

  const reviewCards = useMemo(() => {
    const total = Number(summary?.total_events || 0);
    const blocked = Number(summary?.blocked || 0);
    const escalated = Number(summary?.escalated || 0);
    const highSeverity = Number(summary?.high_severity || 0);

    return [
      { title: 'Observed events', value: total ? total.toLocaleString() : '0', note: 'All of the log entries we loaded into this review screen.' },
      { title: 'Blocked actions', value: blocked ? blocked.toLocaleString() : '0', note: 'Cases where the system stopped an action instead of letting it go through.' },
      { title: 'Escalations', value: escalated ? escalated.toLocaleString() : '0', note: 'Cases the system pushed toward more review or human follow-up.' },
      { title: 'High severity', value: highSeverity ? highSeverity.toLocaleString() : '0', note: 'Cases marked as more serious and worth extra attention.' },
    ];
  }, [summary]);

  return (
    <>
      <PageNav />

      <div className="min-h-screen pt-20" style={{ background: 'var(--void)' }}>
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(circle at 20% 18%, rgba(177,59,255,0.16) 0%, transparent 28%), radial-gradient(circle at 78% 14%, rgba(255,204,0,0.1) 0%, transparent 24%), linear-gradient(180deg, rgba(9,0,64,0.06) 0%, rgba(9,0,24,0.22) 100%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-8">
          <motion.section
            className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div
              className="relative overflow-hidden rounded-[30px] p-7"
              style={{
                background: 'linear-gradient(145deg, rgba(14,0,55,0.92) 0%, rgba(12,9,66,0.9) 55%, rgba(5,12,38,0.94) 100%)',
                border: '1px solid rgba(177,59,255,0.18)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.34)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(177,59,255,0.08) 0%, rgba(255,255,255,0.03) 100%)' }} />
              <p className="mb-3 text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--electric)', fontFamily: 'Syne, sans-serif' }}>
                Challenge · Glass Box
              </p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
                We turn hard-to-read AI decision logs into a review screen people can actually follow.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'DM Sans, sans-serif' }}>
                This Glass Box view pulls in the challenge logs and explains, in plain language, what the system did, why it stepped in, and which cases may need a human to look closer.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <DataIngestButton endpoint="/api/audit/ingest" label="Refresh audit logs" onComplete={loadAudit} />
                <div className="inline-flex min-h-[42px] items-center rounded-full border px-4 py-2 text-xs" style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.72)', fontFamily: 'JetBrains Mono, monospace' }}>
                  Last event · {loading ? '...' : formatDate(summary?.last_event)}
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {reviewCards.map((card, index) => (
                  <motion.div
                    key={card.title}
                    className="rounded-[22px] p-4"
                    style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(177,59,255,0.12)' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + index * 0.04, duration: 0.3 }}
                  >
                    <div className="mb-2 text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--electric)', fontFamily: 'Syne, sans-serif' }}>
                      {card.title}
                    </div>
                    <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {loading ? '...' : card.value}
                    </div>
                    <div className="mt-2 text-xs leading-5" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'DM Sans, sans-serif' }}>
                      {card.note}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[30px] p-6"
              style={{
                background: 'rgba(10,7,39,0.84)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--gold)', fontFamily: 'Syne, sans-serif' }}>
                    What this page helps you see
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    What people can understand here
                  </h2>
                </div>
                <Eye size={18} style={{ color: 'var(--gold)' }} />
              </div>

              <div className="space-y-3">
                {[
                  { icon: <ShieldAlert size={15} />, title: 'What happened', text: 'Each case shows what the system did and when it happened, so nobody has to read raw logs first.' },
                  { icon: <ArrowRightLeft size={15} />, title: 'Why it happened', text: 'We surface the rule, reason, and suggested correction that led to the system response.' },
                  { icon: <BadgeCheck size={15} />, title: 'Why this matters', text: 'This helps judges, reviewers, and teammates quickly spot risky cases and decide whether a human should step in.' },
                ].map(item => (
                  <div key={item.title} className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      <span style={{ color: 'var(--gold)' }}>{item.icon}</span>
                      {item.title}
                    </div>
                    <p className="mt-2 text-xs leading-6" style={{ color: 'rgba(255,255,255,0.68)', fontFamily: 'DM Sans, sans-serif' }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {error ? (
            <div className="mt-6 rounded-[24px] border px-4 py-4 text-sm" style={{ borderColor: 'rgba(255,45,85,0.22)', background: 'rgba(255,45,85,0.08)', color: '#FFD7E0' }}>
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <motion.section
              className="rounded-[28px] p-6"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(177,59,255,0.14)',
                backdropFilter: 'blur(16px)',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--electric)', fontFamily: 'Syne, sans-serif' }}>
                    Event Playback
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Recent inhibitor timeline
                  </h2>
                  <p className="mt-2 max-w-md text-xs leading-6" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'DM Sans, sans-serif' }}>
                    Click any recent event to have Holmes explain what happened in simple terms.
                  </p>
                </div>
                <Clock3 size={18} style={{ color: 'var(--electric)' }} />
              </div>

              <div className="relative pl-6">
                <div className="absolute bottom-0 left-[18px] top-0" style={{ width: 1, background: 'linear-gradient(180deg, rgba(177,59,255,0.5) 0%, rgba(177,59,255,0.04) 100%)' }} />
                <div className="space-y-4">
                  {(events.length ? events : Array.from({ length: 5 }).map((_, index) => ({
                    source: 'loading',
                    event_timestamp: '',
                    request_id: `loading-${index}`,
                    api_key: '',
                    agent_id: '',
                    mode: '',
                    event_type: 'Loading event…',
                    severity: '',
                    action: '',
                    policy_trigger: '',
                    reason: '',
                    proposed_action: '',
                    corrected_action: '',
                  }))).map((event, index) => {
                    const tone = eventTone(event.action, event.severity);
                    return (
                      <motion.div
                        key={`${event.request_id}-${index}`}
                        className="relative ml-6 rounded-[22px] p-4 cursor-pointer"
                        style={{
                          background:
                            selectedEvent?.request_id === event.request_id && selectedEvent?.event_timestamp === event.event_timestamp
                              ? 'rgba(31, 25, 74, 0.94)'
                              : 'rgba(12,10,44,0.78)',
                          border:
                            selectedEvent?.request_id === event.request_id && selectedEvent?.event_timestamp === event.event_timestamp
                              ? '1px solid rgba(124,217,255,0.28)'
                              : '1px solid rgba(255,255,255,0.06)',
                        }}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + index * 0.05, duration: 0.32 }}
                        whileHover={{ x: 4 }}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="absolute -left-[38px] top-6 h-4 w-4 rounded-full" style={{ background: tone, boxShadow: `0 0 20px ${tone}` }} />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                            {event.action || event.event_type}
                          </span>
                          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {loading ? '...' : formatDate(event.event_timestamp)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.72)', fontFamily: 'DM Sans, sans-serif' }}>
                          {loading ? 'Loading the latest challenge log traces.' : shortReason(event)}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            <motion.section
              className="rounded-[28px] p-6"
              style={{
                background: 'rgba(9,11,38,0.84)',
                border: '1px solid rgba(255,204,0,0.14)',
                backdropFilter: 'blur(16px)',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--gold)', fontFamily: 'Syne, sans-serif' }}>
                    Audit Breakdown
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Actions and policies that surfaced
                  </h2>
                  <p className="mt-2 max-w-md text-xs leading-6" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'DM Sans, sans-serif' }}>
                    Click an action or trigger below and Holmes will explain what it usually means.
                  </p>
                </div>
                <BookLock size={18} style={{ color: 'var(--gold)' }} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
                <div className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Activity size={15} style={{ color: '#7CD9FF' }} />
                    <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      Action share
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {actions.map(item => {
                      const count = Number(item.count || 0);
                      const total = Math.max(Number(summary?.total_events || 0), 1);
                      const pct = Math.max(8, Math.round((count / total) * 100));
                      const tone = eventTone(item.action);
                      return (
                        <button
                          key={item.action}
                          type="button"
                          className="block w-full rounded-[18px] px-3 py-3 text-left transition-colors"
                          onClick={() => setSelectedSurface({ kind: 'action', label: item.action, count: item.count })}
                          style={{
                            background:
                              selectedSurface?.kind === 'action' && selectedSurface.label === item.action
                                ? 'rgba(31, 25, 74, 0.94)'
                                : 'rgba(255,255,255,0.03)',
                            border:
                              selectedSurface?.kind === 'action' && selectedSurface.label === item.action
                                ? '1px solid rgba(124,217,255,0.28)'
                                : '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'Syne, sans-serif' }}>{item.action}</span>
                            <span style={{ color: tone, fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={15} style={{ color: 'var(--gold)' }} />
                    <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      Most common triggers
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {policies.map(item => (
                        <button
                          key={item.policy_trigger}
                          type="button"
                          className="block w-full rounded-[18px] px-3 py-3 text-left"
                          style={{
                            background:
                              selectedSurface?.kind === 'policy' && selectedSurface.label === item.policy_trigger
                                ? 'rgba(31, 25, 74, 0.94)'
                                : 'rgba(255,255,255,0.03)',
                            border:
                              selectedSurface?.kind === 'policy' && selectedSurface.label === item.policy_trigger
                                ? '1px solid rgba(255,204,0,0.28)'
                                : '1px solid rgba(255,255,255,0.06)',
                          }}
                          onClick={() => setSelectedSurface({ kind: 'policy', label: item.policy_trigger, count: item.count })}
                        >
                        <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                          {item.policy_trigger}
                        </div>
                        <div className="mt-1 text-[11px]" style={{ color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {Number(item.count || 0)} observations
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          <motion.section
            className="mt-6 rounded-[28px] p-6"
            style={{
              background: 'rgba(8,10,37,0.84)',
              border: '1px solid rgba(124,217,255,0.14)',
              backdropFilter: 'blur(16px)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.4 }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                  Holmes Explainer
                </p>
                <h2 className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Click a timeline event to get a simple explanation
                </h2>
              </div>
              <Sparkles size={18} style={{ color: '#7CD9FF' }} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.38fr_0.62fr]">
              <div className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.56)', fontFamily: 'Syne, sans-serif' }}>
                  Selected event
                </div>
                {selectedEvent ? (
                  <>
                    <div className="mt-3 inline-flex rounded-full px-3 py-1 text-[10px] uppercase" style={{ background: `${eventTone(selectedEvent.action, selectedEvent.severity)}18`, color: eventTone(selectedEvent.action, selectedEvent.severity), fontFamily: 'JetBrains Mono, monospace' }}>
                      {selectedEvent.action || selectedEvent.event_type}
                    </div>
                    <div className="mt-3 text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {selectedEvent.policy_trigger || selectedEvent.event_type || 'No trigger listed'}
                    </div>
                    <p className="mt-2 text-xs leading-6" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'DM Sans, sans-serif' }}>
                      {formatDate(selectedEvent.event_timestamp)}
                    </p>
                    <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.76)', fontFamily: 'DM Sans, sans-serif' }}>
                      {shortReason(selectedEvent)}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'DM Sans, sans-serif' }}>
                    Select a recent timeline event to inspect it.
                  </p>
                )}
              </div>

              <div className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-3 text-[10px] uppercase tracking-[0.24em]" style={{ color: '#7CD9FF', fontFamily: 'Syne, sans-serif' }}>
                  Holmes summary
                </div>
                {briefLoading ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif' }}>
                      <span className="flex gap-1">
                        {[0, 1, 2].map(dot => (
                          <motion.span
                            key={dot}
                            className="h-2 w-2 rounded-full"
                            style={{ background: '#7CD9FF' }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                          />
                        ))}
                      </span>
                      Holmes is explaining this event…
                    </div>
                    <div className="h-3 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-3 w-[86%] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-3 w-[70%] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                ) : (
                  <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'DM Sans, sans-serif' }}>
                    {eventBrief || 'Click a recent timeline event and Holmes will explain what happened, why the system stepped in, and what a reviewer should take away.'}
                  </p>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section
            className="mt-6 rounded-[28px] p-6"
            style={{
              background: 'rgba(8,10,37,0.84)',
              border: '1px solid rgba(255,204,0,0.14)',
              backdropFilter: 'blur(16px)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--gold)', fontFamily: 'Syne, sans-serif' }}>
                  Holmes Breakdown
                </p>
                <h2 className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Click an action or trigger to learn what it means
                </h2>
              </div>
              <BookLock size={18} style={{ color: 'var(--gold)' }} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.35fr_0.65fr]">
              <div className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.56)', fontFamily: 'Syne, sans-serif' }}>
                  Selected summary item
                </div>
                {selectedSurface ? (
                  <>
                    <div className="mt-3 inline-flex rounded-full px-3 py-1 text-[10px] uppercase" style={{ background: 'rgba(255,204,0,0.14)', color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {selectedSurface.kind}
                    </div>
                    <div className="mt-3 text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {selectedSurface.label}
                    </div>
                    <div className="mt-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Number(selectedSurface.count || 0)} observations
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'DM Sans, sans-serif' }}>
                    Select an action or policy trigger above to inspect it.
                  </p>
                )}
              </div>

              <div className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-3 text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--gold)', fontFamily: 'Syne, sans-serif' }}>
                  Holmes explanation
                </div>
                {surfaceLoading ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif' }}>
                      <span className="flex gap-1">
                        {[0, 1, 2].map(dot => (
                          <motion.span
                            key={dot}
                            className="h-2 w-2 rounded-full"
                            style={{ background: 'var(--gold)' }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                          />
                        ))}
                      </span>
                      Holmes is explaining this summary item…
                    </div>
                    <div className="h-3 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-3 w-[84%] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-3 w-[68%] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                ) : (
                  <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'DM Sans, sans-serif' }}>
                    {surfaceBrief || 'Click any action bar or policy trigger card above and Holmes will explain what it means in simple terms.'}
                  </p>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section
            className="mt-8 grid gap-4 md:grid-cols-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
          >
            {[
              {
                title: 'Expected input',
                body: 'Read-only CSV and JSONL inhibitor logs. We do not modify the provided sample_logs baselines; we ingest and render them.',
              },
              {
                title: 'Rendering behavior',
                body: 'The dashboard parses event timestamps, actions, severities, and policy triggers into summaries, timelines, and reviewer-friendly inspection views.',
              },
              {
                title: 'Why this helps audit review',
                body: 'A compliance or demo reviewer can quickly answer what happened, why the intervention occurred, and what should be checked next without reading raw logs.',
              },
            ].map(card => (
              <div
                key={card.title}
                className="rounded-[24px] p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <div className="mb-3 text-sm font-semibold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {card.title}
                </div>
                <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.74)', fontFamily: 'DM Sans, sans-serif' }}>
                  {card.body}
                </p>
              </div>
            ))}
          </motion.section>
        </div>
      </div>
    </>
  );
}
