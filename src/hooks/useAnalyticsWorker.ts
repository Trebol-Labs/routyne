'use client';

import { useEffect, useRef, useState, startTransition } from 'react';
import type { HistoryEntry } from '@/types/workout';
import type { PRRow, WeekPoint } from '@/workers/analytics.worker';

export type { PRRow, WeekPoint };

interface AnalyticsResult {
  prs: PRRow[];
  weeklyVolume: WeekPoint[];
  loading: boolean;
}

/**
 * Computes PRs and weekly volume trends in a Web Worker.
 * Falls back to empty arrays while computing or if workers are unavailable.
 */
export function useAnalyticsWorker(history: HistoryEntry[]): AnalyticsResult {
  const workerRef = useRef<Worker | null>(null);
  const [prs, setPRs] = useState<PRRow[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<WeekPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.Worker) return;

    const worker = new Worker(
      new URL('../workers/analytics.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<{
      type: string;
      prs: PRRow[];
      weeklyVolume: WeekPoint[];
    }>) => {
      if (event.data.type === 'ANALYTICS_RESULT') {
        setPRs(event.data.prs);
        setWeeklyVolume(event.data.weeklyVolume);
        setLoading(false);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Recompute whenever history changes
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || history.length === 0) return;

    startTransition(() => setLoading(true));
    worker.postMessage({ type: 'COMPUTE', history });
  }, [history]);

  return { prs, weeklyVolume, loading };
}
