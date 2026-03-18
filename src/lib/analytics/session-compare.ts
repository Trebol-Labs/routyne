/**
 * Session Comparison Analytics
 * Computes deltas between a completed session and the previous equivalent session.
 */

import { estimate1RM } from '@/lib/progression/engine';
import type { HistoryEntry, SetDelta, WorkoutSummary } from '@/types/workout';

// ── PR detection ──────────────────────────────────────────────────────────────

/**
 * Returns true if this set detail beats the all-time record for the exercise.
 * A PR is when the estimated 1RM exceeds any previous estimate.
 */
function isPersonalRecord(
  weight: number,
  reps: number,
  exerciseName: string,
  priorHistory: HistoryEntry[],
): boolean {
  const normalName = exerciseName.trim().toLowerCase();
  const newOneRM = estimate1RM(weight, reps);

  for (const entry of priorHistory) {
    const exVol = entry.volumeData.find(
      (ev) => ev.cleanName.trim().toLowerCase() === normalName,
    );
    for (const sd of exVol?.setDetails ?? []) {
      if ((sd.weight ?? 0) > 0 && sd.repsDone > 0 && sd.setType !== 'warmup') {
        if (estimate1RM(sd.weight!, sd.repsDone) >= newOneRM) return false;
      }
    }
  }
  return true;
}

// ── Delta computation ─────────────────────────────────────────────────────────

/**
 * Build a WorkoutSummary comparing the new entry against the last equivalent session.
 *
 * "Equivalent" means the same sessionIdx in any prior history entry.
 */
export function buildWorkoutSummary(
  entry: HistoryEntry,
  allHistory: HistoryEntry[],
  totalSets: number,
  durationSeconds: number,
): WorkoutSummary {
  // Find previous entry for the same session type (same sessionIdx)
  const prior = allHistory
    .filter(
      (h) =>
        h.id !== entry.id &&
        h.sessionIdx === entry.sessionIdx,
    )
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0] ?? null;

  const priorHistory = allHistory.filter(
    (h) => h.id !== entry.id && h.completedAt < entry.completedAt,
  );

  // Compute volume delta
  const volumeDeltaPercent =
    prior && prior.totalVolume > 0
      ? Math.round(((entry.totalVolume - prior.totalVolume) / prior.totalVolume) * 100)
      : null;

  // Compute set-level deltas and detect PRs
  const newPRs: SetDelta[] = [];

  for (const exVol of entry.volumeData) {
    const priorExVol = prior?.volumeData.find(
      (ev) => ev.cleanName.trim().toLowerCase() === exVol.cleanName.trim().toLowerCase(),
    );

    for (const sd of exVol.setDetails ?? []) {
      if ((sd.weight ?? 0) <= 0 || sd.setType === 'warmup') continue;

      const priorSd = priorExVol?.setDetails?.find((psd) => psd.setIdx === sd.setIdx);
      const weightDelta = priorSd?.weight != null ? sd.weight! - priorSd.weight : 0;
      const repsDelta = priorSd ? sd.repsDone - priorSd.repsDone : 0;

      const isPR = isPersonalRecord(sd.weight!, sd.repsDone, exVol.cleanName, priorHistory);

      if (isPR || weightDelta > 0 || repsDelta > 0) {
        newPRs.push({
          exerciseName: exVol.cleanName,
          setIdx: sd.setIdx,
          weightDelta,
          repsDelta,
          isNewPR: isPR,
        });
      }
    }
  }

  // Deduplicate PRs: keep only the best set per exercise
  const prMap = new Map<string, SetDelta>();
  for (const pr of newPRs) {
    const existing = prMap.get(pr.exerciseName);
    if (!existing || (pr.isNewPR && !existing.isNewPR) || pr.weightDelta > existing.weightDelta) {
      prMap.set(pr.exerciseName, pr);
    }
  }

  return {
    entry,
    durationSeconds,
    totalSets,
    newPRs: [...prMap.values()],
    volumeDeltaPercent,
    previousEntry: prior,
  };
}
