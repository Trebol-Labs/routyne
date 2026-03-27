/**
 * Analytics Worker — computes PRs and volume trends off the main thread.
 *
 * Messages IN:
 *   { type: 'COMPUTE'; history: HistoryEntry[] }
 *
 * Messages OUT:
 *   { type: 'ANALYTICS_RESULT'; prs: PRRow[]; weeklyVolume: WeekPoint[] }
 */

import type { HistoryEntry } from '@/types/workout';

// ── Output types ──────────────────────────────────────────────────────────────

export interface PRRow {
  cleanName: string;
  sessions: number;
  bestSetVolume: number;
  bestWeight: number;
  bestReps: number;
  bestBodyweightReps: number;
  hasWeightedSet: boolean;
}

export interface WeekPoint {
  label: string;   // 'Mar 17'
  volume: number;
}

// ── PR computation ────────────────────────────────────────────────────────────

function computePRs(history: HistoryEntry[]): PRRow[] {
  const prMap = new Map<string, PRRow>();

  for (const entry of history) {
    for (const ev of entry.volumeData) {
      if (!prMap.has(ev.cleanName)) {
        prMap.set(ev.cleanName, {
          cleanName: ev.cleanName,
          sessions: 1,
          bestSetVolume: 0,
          bestWeight: 0,
          bestReps: 0,
          bestBodyweightReps: 0,
          hasWeightedSet: false,
        });
      } else {
        prMap.get(ev.cleanName)!.sessions++;
      }

      const row = prMap.get(ev.cleanName)!;
      for (const sd of ev.setDetails ?? []) {
        const reps = sd.repsDone ?? 0;
        const weight = sd.weight ?? 0;
        if (reps <= 0) continue;

        if (weight > 0) {
          const vol = weight * reps;
          if (vol > row.bestSetVolume) {
            row.bestSetVolume = vol;
            row.bestWeight = weight;
            row.bestReps = reps;
            row.hasWeightedSet = true;
          }
        } else {
          if (reps > row.bestBodyweightReps) {
            row.bestBodyweightReps = reps;
          }
        }
      }
    }
  }

  return Array.from(prMap.values())
    .filter((r) => r.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 30);
}

// ── Weekly volume computation (last 8 weeks) ──────────────────────────────────

function computeWeeklyVolume(history: HistoryEntry[]): WeekPoint[] {
  const now = Date.now();
  const weeks = 8;
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

  const buckets = Array.from({ length: weeks }, (_, i) => ({
    start: now - (weeks - i) * MS_PER_WEEK,
    end: now - (weeks - i - 1) * MS_PER_WEEK,
    volume: 0,
  }));

  for (const entry of history) {
    const ts = new Date(entry.completedAt).getTime();
    for (const bucket of buckets) {
      if (ts >= bucket.start && ts < bucket.end) {
        bucket.volume += entry.totalVolume ?? 0;
        break;
      }
    }
  }

  return buckets.map((b) => ({
    label: new Date(b.start + MS_PER_WEEK / 2)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    volume: Math.round(b.volume),
  }));
}

// ── Message handler ───────────────────────────────────────────────────────────

self.addEventListener('message', (event: MessageEvent<{
  type: 'COMPUTE';
  history: HistoryEntry[];
}>) => {
  if (event.data.type !== 'COMPUTE') return;

  const { history } = event.data;
  const prs = computePRs(history);
  const weeklyVolume = computeWeeklyVolume(history);

  self.postMessage({ type: 'ANALYTICS_RESULT', prs, weeklyVolume });
});

export {};
