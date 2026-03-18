/**
 * Progression Engine
 * Computes weight/rep suggestions based on training history.
 * Supports Linear Progression, Double Progression, and RPE-based models.
 */

import type {
  HistoryEntry,
  ProgressionSuggestion,
  ProgressionModel,
  SetType,
} from '@/types/workout';

// ── 1RM Formulas ──────────────────────────────────────────────────────────────

/** Epley formula: weight × (1 + reps / 30) */
export function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

/** Brzycki formula: weight / (1.0278 - 0.0278 × reps) */
export function brzycki1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (weight <= 0 || reps <= 0) return 0;
  const denom = 1.0278 - 0.0278 * reps;
  return denom <= 0 ? 0 : weight / denom;
}

/** Average of Epley + Brzycki for better accuracy */
export function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round((epley1RM(weight, reps) + brzycki1RM(weight, reps)) / 2);
}

// ── Percentage weight from 1RM ────────────────────────────────────────────────

/** Returns weight for a given rep target based on % 1RM tables */
export function weightFromOneRM(oneRM: number, targetReps: number): number {
  // Approximate % 1RM by rep count (Prilepin-inspired)
  const percentages: Record<number, number> = {
    1: 1.00, 2: 0.97, 3: 0.94, 4: 0.91, 5: 0.87,
    6: 0.85, 7: 0.83, 8: 0.80, 10: 0.75, 12: 0.70,
    15: 0.65, 20: 0.60,
  };
  const closest = Object.keys(percentages)
    .map(Number)
    .sort((a, b) => Math.abs(a - targetReps) - Math.abs(b - targetReps))[0];
  return Math.round((oneRM * percentages[closest]) * 2) / 2; // round to nearest 0.5
}

// ── History helpers ───────────────────────────────────────────────────────────

interface SetDataPoint {
  weight: number;
  reps: number;
  rpe?: number;
  setType?: SetType;
  date: Date;
}

/** Extract all working-set data points for a given exercise from history */
function getWorkingSetHistory(
  history: HistoryEntry[],
  exerciseName: string,
): SetDataPoint[] {
  const normalName = exerciseName.trim().toLowerCase();
  const points: SetDataPoint[] = [];

  for (const entry of history) {
    const exVol = entry.volumeData.find(
      (ev) => ev.cleanName.trim().toLowerCase() === normalName,
    );
    if (!exVol?.setDetails?.length) continue;

    for (const sd of exVol.setDetails) {
      if ((sd.weight ?? 0) > 0 && sd.repsDone > 0) {
        // Skip warmup sets for progression calculations
        if (sd.setType === 'warmup') continue;
        points.push({
          weight: sd.weight!,
          reps: sd.repsDone,
          rpe: sd.rpe,
          setType: sd.setType,
          date: entry.completedAt,
        });
      }
    }
  }

  // Sort oldest → newest
  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Get the best (heaviest weight × most reps) set from recent history */
function getBestRecentSet(
  points: SetDataPoint[],
  lookback = 5,
): SetDataPoint | null {
  const recent = points.slice(-lookback);
  if (!recent.length) return null;
  return recent.reduce((best, p) => {
    const bestScore = estimate1RM(best.weight, best.reps);
    const pScore = estimate1RM(p.weight, p.reps);
    return pScore > bestScore ? p : best;
  });
}

/** Get the most recent session data for this exercise (all sets) */
function getLastSessionSets(
  history: HistoryEntry[],
  exerciseName: string,
): SetDataPoint[] {
  const normalName = exerciseName.trim().toLowerCase();
  for (const entry of [...history].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
  )) {
    const exVol = entry.volumeData.find(
      (ev) => ev.cleanName.trim().toLowerCase() === normalName,
    );
    if (exVol?.setDetails?.length) {
      return exVol.setDetails
        .filter((sd) => (sd.weight ?? 0) > 0 && sd.repsDone > 0 && sd.setType !== 'warmup')
        .map((sd) => ({
          weight: sd.weight!,
          reps: sd.repsDone,
          rpe: sd.rpe,
          setType: sd.setType,
          date: entry.completedAt,
        }));
    }
  }
  return [];
}

// ── Progression detection ─────────────────────────────────────────────────────

type ProgressionStatus = 'advance' | 'maintain' | 'deload';

/**
 * Detect if the user should advance weight, maintain, or deload.
 * - advance: all sets in last 2 sessions completed target reps at same weight
 * - deload:  failed to hit target reps in last 2 sessions consecutively
 * - maintain: otherwise
 */
export function detectProgressionStatus(
  history: HistoryEntry[],
  exerciseName: string,
  targetRepsMin: number,
): ProgressionStatus {
  const normalName = exerciseName.trim().toLowerCase();

  // Get last 2 sessions for this exercise
  const sessions: HistoryEntry[] = [];
  for (const entry of [...history].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
  )) {
    const has = entry.volumeData.some(
      (ev) => ev.cleanName.trim().toLowerCase() === normalName,
    );
    if (has) sessions.push(entry);
    if (sessions.length >= 2) break;
  }

  if (sessions.length < 2) return 'maintain';

  const results = sessions.map((entry) => {
    const exVol = entry.volumeData.find(
      (ev) => ev.cleanName.trim().toLowerCase() === normalName,
    )!;
    const sets = (exVol.setDetails ?? []).filter((sd) => sd.setType !== 'warmup');
    const allHitTarget = sets.length > 0 && sets.every((sd) => sd.repsDone >= targetRepsMin);
    return allHitTarget;
  });

  const bothAdvanced = results.every(Boolean);
  const bothFailed = results.every((r) => !r);

  if (bothAdvanced) return 'advance';
  if (bothFailed) return 'deload';
  return 'maintain';
}

// ── Main suggestion function ──────────────────────────────────────────────────

const ADVANCE_INCREMENT_KG = 2.5;
const ADVANCE_INCREMENT_LBS = 5;
const DELOAD_PERCENT = 0.9;

/**
 * Get a progression suggestion for the next set of a given exercise.
 *
 * Priority:
 * 1. If no history → suggest bodyweight/starter weight
 * 2. If last session → apply progression model
 * 3. Fallback → maintain last weight
 */
export function getProgressionSuggestion(
  history: HistoryEntry[],
  exerciseName: string,
  targetRepsMin: number,
  targetRepsMax: number,
  weightUnit: 'kg' | 'lbs' = 'kg',
  model: ProgressionModel = 'linear',
): ProgressionSuggestion {
  const increment = weightUnit === 'kg' ? ADVANCE_INCREMENT_KG : ADVANCE_INCREMENT_LBS;
  const allPoints = getWorkingSetHistory(history, exerciseName);
  const lastSets = getLastSessionSets(history, exerciseName);

  // No history at all
  if (!allPoints.length || !lastSets.length) {
    return {
      suggestedWeight: null,
      suggestedReps: targetRepsMax,
      model,
      confidence: 'low',
      reason: 'No previous data — start with a comfortable weight',
    };
  }

  const lastMaxWeight = Math.max(...lastSets.map((s) => s.weight));
  const status = detectProgressionStatus(history, exerciseName, targetRepsMin);

  if (model === 'linear') {
    if (status === 'advance') {
      const next = Math.round((lastMaxWeight + increment) * 4) / 4; // round to 0.25
      return {
        suggestedWeight: next,
        suggestedReps: targetRepsMin,
        model,
        confidence: 'high',
        reason: `+${increment}${weightUnit} — you completed all sets at target reps`,
      };
    }
    if (status === 'deload') {
      const next = Math.round(lastMaxWeight * DELOAD_PERCENT * 4) / 4;
      return {
        suggestedWeight: next,
        suggestedReps: targetRepsMax,
        model,
        confidence: 'high',
        reason: 'Deload (-10%) — missed target reps twice in a row',
      };
    }
    // maintain
    return {
      suggestedWeight: lastMaxWeight,
      suggestedReps: targetRepsMax,
      model,
      confidence: 'medium',
      reason: `Maintain ${lastMaxWeight}${weightUnit} — aim for full reps`,
    };
  }

  if (model === 'double') {
    // Double progression: increase reps first, then weight
    const lastReps = Math.max(...lastSets.map((s) => s.reps));
    if (lastReps >= targetRepsMax) {
      const next = Math.round((lastMaxWeight + increment) * 4) / 4;
      return {
        suggestedWeight: next,
        suggestedReps: targetRepsMin,
        model,
        confidence: 'high',
        reason: `+${increment}${weightUnit} — you hit the top of the rep range`,
      };
    }
    return {
      suggestedWeight: lastMaxWeight,
      suggestedReps: Math.min(lastReps + 1, targetRepsMax),
      model,
      confidence: 'medium',
      reason: `Add 1 rep — aim for ${Math.min(lastReps + 1, targetRepsMax)} reps`,
    };
  }

  // RPE-based: use 1RM to compute load at target RPE 8
  const best = getBestRecentSet(allPoints);
  if (best) {
    const oneRM = estimate1RM(best.weight, best.reps);
    const targetRpe8Weight = weightFromOneRM(oneRM, targetRepsMax);
    return {
      suggestedWeight: targetRpe8Weight,
      suggestedReps: targetRepsMax,
      model,
      confidence: 'medium',
      reason: `~RPE 8 based on estimated 1RM (${oneRM.toFixed(1)}${weightUnit})`,
    };
  }

  return {
    suggestedWeight: lastMaxWeight,
    suggestedReps: targetRepsMax,
    model,
    confidence: 'low',
    reason: 'Maintain last weight',
  };
}

// ── Quick helper: get last weight for an exercise ─────────────────────────────

export function getLastWeightForExercise(
  history: HistoryEntry[],
  exerciseName: string,
): number | null {
  const sets = getLastSessionSets(history, exerciseName);
  if (!sets.length) return null;
  return Math.max(...sets.map((s) => s.weight));
}
