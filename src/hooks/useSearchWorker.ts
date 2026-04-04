'use client';

import { useEffect, useRef, useState, useCallback, startTransition } from 'react';
import type { HistoryEntry } from '@/types/workout';
import type { HistoryEntryLean } from '@/workers/search.worker';

interface UseSearchWorkerResult {
  results: HistoryEntryLean[];
  search: (query: string) => void;
  ready: boolean;
}

/** Fuzzy-searches workout history using a Web Worker (Fuse.js off-thread). */
export function useSearchWorker(history: HistoryEntry[]): UseSearchWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const [results, setResults] = useState<HistoryEntryLean[]>([]);
  const [ready, setReady] = useState(false);

  // Spawn worker once and build initial index
  useEffect(() => {
    // Workers are only available in browser + if the env supports them
    if (typeof window === 'undefined' || !window.Worker) return;

    const worker = new Worker(
      new URL('../workers/search.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<{ type: string; results: HistoryEntryLean[]; query: string }>) => {
      if (event.data.type === 'RESULTS') {
        setResults(event.data.results);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Re-index whenever history changes
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const lean: HistoryEntryLean[] = history.map((e) => ({
      id: e.id,
      sessionTitle: e.sessionTitle,
      completedAt: e.completedAt instanceof Date
        ? e.completedAt.toISOString()
        : String(e.completedAt),
      totalVolume: e.totalVolume ?? 0,
      sessionIdx: e.sessionIdx ?? 0,
    }));

    worker.postMessage({ type: 'INIT', entries: lean });
    startTransition(() => setReady(true));
  }, [history]);

  const search = useCallback((query: string) => {
    workerRef.current?.postMessage({ type: 'SEARCH', query });
  }, []);

  return { results, search, ready };
}
