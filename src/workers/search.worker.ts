/**
 * Search Worker — runs Fuse.js history fuzzy search off the main thread.
 *
 * Messages IN:
 *   { type: 'SEARCH'; query: string; entries: HistoryEntryLean[] }
 *   { type: 'INIT'; entries: HistoryEntryLean[] }
 *
 * Messages OUT:
 *   { type: 'RESULTS'; results: HistoryEntryLean[]; query: string }
 */

import Fuse from 'fuse.js';

// Lean shape — only fields needed for search display (avoids serializing full volumeData)
export interface HistoryEntryLean {
  id: string;
  sessionTitle: string;
  completedAt: string;
  totalVolume: number;
  sessionIdx: number;
}

let fuse: Fuse<HistoryEntryLean> | null = null;

function buildIndex(entries: HistoryEntryLean[]): void {
  fuse = new Fuse(entries, {
    keys: ['sessionTitle'],
    threshold: 0.35,
    includeScore: true,
    minMatchCharLength: 1,
  });
}

self.addEventListener('message', (event: MessageEvent<{
  type: 'INIT' | 'SEARCH';
  entries?: HistoryEntryLean[];
  query?: string;
}>) => {
  const { type, entries, query } = event.data;

  if (type === 'INIT' && entries) {
    buildIndex(entries);
    return;
  }

  if (type === 'SEARCH') {
    if (!fuse) {
      self.postMessage({ type: 'RESULTS', results: [], query: query ?? '' });
      return;
    }

    const q = query ?? '';
    const results = q.length === 0
      ? (fuse as unknown as { _docs: HistoryEntryLean[] })._docs.slice(0, 50)
      : fuse.search(q).slice(0, 50).map((r) => r.item);

    self.postMessage({ type: 'RESULTS', results, query: q });
  }
});

export {};
