/**
 * Exercise History Analytics
 * Computes per-exercise progress data for charts and detail views.
 */

import { estimate1RM } from '@/lib/progression/engine';
import type {
  HistoryEntry,
  ExerciseProgressData,
  ExerciseProgressPoint,
} from '@/types/workout';

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clampRound(value: number, decimals = 1): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

// ── Main computation ──────────────────────────────────────────────────────────

/**
 * Build progress data for a specific exercise across all history.
 * Returns data points sorted oldest → newest, suitable for charting.
 */
export function getExerciseProgressData(
  cleanName: string,
  history: HistoryEntry[],
): ExerciseProgressData {
  const normalName = cleanName.trim().toLowerCase();

  // Filter entries that include this exercise
  const relevant = history
    .filter((e) =>
      e.volumeData.some((ev) => ev.cleanName.trim().toLowerCase() === normalName),
    )
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

  if (!relevant.length) {
    return {
      cleanName,
      points: [],
      allTimePR: null,
      recentTrend: 'flat',
    };
  }

  const points: ExerciseProgressPoint[] = relevant.map((entry) => {
    const exVol = entry.volumeData.find(
      (ev) => ev.cleanName.trim().toLowerCase() === normalName,
    )!;

    const workingSets = (exVol.setDetails ?? []).filter(
      (sd) => (sd.weight ?? 0) > 0 && sd.repsDone > 0 && sd.setType !== 'warmup',
    );

    const maxWeight = workingSets.length
      ? Math.max(...workingSets.map((sd) => sd.weight!))
      : 0;

    const bestSet = workingSets.reduce(
      (best, sd) => {
        const score = estimate1RM(sd.weight!, sd.repsDone);
        return score > estimate1RM(best?.weight ?? 0, best?.repsDone ?? 0) ? sd : best;
      },
      workingSets[0] ?? null,
    );

    const estimatedOneRM = bestSet
      ? estimate1RM(bestSet.weight!, bestSet.repsDone)
      : 0;

    const rpeValues = workingSets.flatMap((sd) => (sd.rpe != null ? [sd.rpe] : []));

    return {
      date: entry.completedAt,
      maxWeight: clampRound(maxWeight),
      totalVolume: clampRound(exVol.totalVolume),
      estimatedOneRM: clampRound(estimatedOneRM),
      avgRpe: rpeValues.length ? clampRound(avg(rpeValues)) : undefined,
    };
  });

  // All-time PR (highest estimated 1RM)
  let allTimePR: ExerciseProgressData['allTimePR'] = null;
  let bestOneRM = 0;

  for (const entry of relevant) {
    const exVol = entry.volumeData.find(
      (ev) => ev.cleanName.trim().toLowerCase() === normalName,
    )!;
    for (const sd of exVol.setDetails ?? []) {
      if ((sd.weight ?? 0) <= 0 || sd.setType === 'warmup') continue;
      const oneRM = estimate1RM(sd.weight!, sd.repsDone);
      if (oneRM > bestOneRM) {
        bestOneRM = oneRM;
        allTimePR = { weight: sd.weight!, reps: sd.repsDone, date: entry.completedAt };
      }
    }
  }

  // Recent trend (last 3 points)
  const recent = points.slice(-3).map((p) => p.estimatedOneRM);
  let trend: ExerciseProgressData['recentTrend'] = 'flat';
  if (recent.length >= 2) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    const delta = last - first;
    if (delta > first * 0.02) trend = 'up';
    else if (delta < -(first * 0.02)) trend = 'down';
  }

  return { cleanName, points, allTimePR, recentTrend: trend };
}

/**
 * Get just the last N sessions for a given exercise (for detail table).
 */
export function getRecentExerciseSessions(
  cleanName: string,
  history: HistoryEntry[],
  limit = 5,
) {
  const normalName = cleanName.trim().toLowerCase();
  return history
    .filter((e) =>
      e.volumeData.some((ev) => ev.cleanName.trim().toLowerCase() === normalName),
    )
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, limit)
    .map((entry) => {
      const exVol = entry.volumeData.find(
        (ev) => ev.cleanName.trim().toLowerCase() === normalName,
      )!;
      return {
        date: entry.completedAt,
        sessionTitle: entry.sessionTitle,
        setsCompleted: exVol.setsCompleted,
        totalVolume: exVol.totalVolume,
        setDetails: exVol.setDetails ?? [],
      };
    });
}
