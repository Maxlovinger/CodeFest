'use client';

import { useState, useTransition } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';

interface DataIngestButtonProps {
  endpoint: string;
  label: string;
  onComplete?: () => void;
}

export default function DataIngestButton({ endpoint, label, onComplete }: DataIngestButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  function handleClick() {
    setError('');
    setStatus('');

    startTransition(async () => {
      try {
        const runRequest = async () => {
          const res = await fetch(endpoint, { method: 'POST' });
          const data = await res.json().catch(() => null);
          return { res, data };
        };

        let { res, data } = await runRequest();
        if (res.status === 503) {
          await new Promise(resolve => setTimeout(resolve, 1200));
          ({ res, data } = await runRequest());
        }

        if (!res.ok) {
          throw new Error(data?.error || `Request failed with status ${res.status}`);
        }

        const details = data?.tracts
          ? `${data.tracts} tracts`
          : data?.events
            ? `${data.events} events`
            : 'Updated';

        setStatus(details);
        onComplete?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refresh data');
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
        style={{
          background: 'rgba(124,217,255,0.12)',
          border: '1px solid rgba(124,217,255,0.28)',
          color: '#D9F7FF',
          fontFamily: 'Syne, sans-serif',
        }}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
        {isPending ? 'Refreshing…' : label}
      </button>

      {status ? (
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.66)', fontFamily: 'JetBrains Mono, monospace' }}>
          {status}
        </p>
      ) : null}

      {error ? (
        <p className="max-w-sm text-[11px]" style={{ color: '#FF9AB0', fontFamily: 'DM Sans, sans-serif' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
