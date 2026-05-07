// Adaptive kcal adjustment. Pure function — no side effects.
// Reference: docs/nutrition/04-calculations-engine.md §4.2 (suggestKcalAdjustment).

import type { NutritionGoal } from '@/types/nutrition';

export type AdjustmentReason = 'too_fast' | 'too_slow' | 'on_track' | 'insufficient_data';

export interface AdjustmentSuggestion {
  weeklyWeightChangePct: number;
  deltaKcal: number;
  reason: AdjustmentReason;
}

export interface SuggestArgs {
  goal: NutritionGoal;
  recentWeights: { date: string; weightKg: number }[];
  currentTargetKcal: number;
}

export function suggestKcalAdjustment({
  goal,
  recentWeights,
}: SuggestArgs): AdjustmentSuggestion {
  if (recentWeights.length < 10) {
    return { weeklyWeightChangePct: 0, deltaKcal: 0, reason: 'insufficient_data' };
  }

  const sorted = [...recentWeights].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-5);
  const previous = sorted.slice(-10, -5);

  const avg = (xs: typeof recent) => xs.reduce((s, w) => s + w.weightKg, 0) / xs.length;
  const avgRecent = avg(recent);
  const avgPrev = avg(previous);

  if (avgPrev === 0) {
    return { weeklyWeightChangePct: 0, deltaKcal: 0, reason: 'insufficient_data' };
  }

  const pct = ((avgRecent - avgPrev) / avgPrev) * 100;

  let deltaKcal = 0;
  let reason: AdjustmentReason = 'on_track';

  if (goal === 'cut') {
    if (pct < -1.0) {
      deltaKcal = +125;
      reason = 'too_fast';
    } else if (pct > -0.3) {
      deltaKcal = -150;
      reason = 'too_slow';
    }
  } else if (goal === 'bulk') {
    if (pct > 0.5) {
      deltaKcal = -125;
      reason = 'too_fast';
    } else if (pct < 0.1) {
      deltaKcal = +150;
      reason = 'too_slow';
    }
  } else {
    if (Math.abs(pct) >= 0.3) {
      deltaKcal = pct > 0 ? -100 : +100;
      reason = pct > 0 ? 'too_fast' : 'too_slow';
    }
  }

  return { weeklyWeightChangePct: pct, deltaKcal, reason };
}
