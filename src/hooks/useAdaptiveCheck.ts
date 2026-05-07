'use client';

import { useCallback, useEffect, useState } from 'react';
import { NUTRITION_ENABLED } from '@/lib/feature-flags';
import { loadAllBodyweight } from '@/lib/db/bodyweight';
import { loadNutritionProfile, saveNutritionProfile } from '@/lib/db/nutritionProfile';
import {
  loadPendingAdjustment,
  savePendingAdjustment,
  clearPendingAdjustment,
  saveLastAdjustmentCheck,
  isAdjustmentCooldownPassed,
  type PendingAdjustment,
} from '@/lib/db/nutritionAdjustment';
import { suggestKcalAdjustment } from '@/lib/nutrition/adaptive';
import { calcMacros } from '@/lib/nutrition/calculations';
import type { BodyweightRecord } from '@/lib/db/schema';

const KG_PER_LB = 0.45359237;

function toKg(entry: BodyweightRecord): number {
  return entry.unit === 'lbs' ? entry.weight * KG_PER_LB : entry.weight;
}

interface UseAdaptiveCheckResult {
  pending: PendingAdjustment | null;
  apply: () => Promise<void>;
  reject: () => Promise<void>;
}

/**
 * On hydration:
 *  - If a pending adjustment is already stored, return it immediately.
 *  - Otherwise, if cooldown has passed and we have ≥10 bodyweight points,
 *    compute one and persist it (only when reason !== 'on_track' /
 *    'insufficient_data', so the banner only appears when there is something
 *    actionable to show).
 */
export function useAdaptiveCheck(): UseAdaptiveCheckResult {
  const [pending, setPending] = useState<PendingAdjustment | null>(null);

  useEffect(() => {
    if (!NUTRITION_ENABLED) return;
    let cancelled = false;

    (async () => {
      const existing = await loadPendingAdjustment();
      if (existing) {
        if (!cancelled) setPending(existing);
        return;
      }

      const cooldownPassed = await isAdjustmentCooldownPassed();
      if (!cooldownPassed) return;

      const profile = await loadNutritionProfile();
      if (!profile) return;

      const bodyweight = await loadAllBodyweight();
      const recentWeights = bodyweight
        .filter((b) => b.deletedAt === null)
        .map((b) => ({ date: b.date, weightKg: toKg(b) }));

      const suggestion = suggestKcalAdjustment({
        goal: profile.goal,
        recentWeights,
        currentTargetKcal: profile.targetKcal,
      });

      await saveLastAdjustmentCheck(Date.now());

      if (suggestion.reason === 'insufficient_data' || suggestion.reason === 'on_track') {
        return;
      }

      const adj: PendingAdjustment = {
        computedAt: new Date().toISOString(),
        reason: suggestion.reason,
        weeklyWeightChangePct: suggestion.weeklyWeightChangePct,
        previousTargetKcal: profile.targetKcal,
        suggestedTargetKcal: profile.targetKcal + suggestion.deltaKcal,
        deltaKcal: suggestion.deltaKcal,
      };
      await savePendingAdjustment(adj);
      if (!cancelled) setPending(adj);
    })().catch((err) => console.error('[Adaptive] check failed', err));

    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(async () => {
    if (!pending) return;
    const profile = await loadNutritionProfile();
    if (!profile) {
      await clearPendingAdjustment();
      setPending(null);
      return;
    }
    const newTarget = pending.suggestedTargetKcal;
    const macros = calcMacros({
      weightKg: profile.weightKg,
      targetKcal: newTarget,
      goal: profile.goal,
    });
    const now = new Date().toISOString();
    await saveNutritionProfile({
      ...profile,
      targetKcal: newTarget,
      proteinG: macros.proteinG,
      fatsG: macros.fatsG,
      carbsG: macros.carbsG,
      updatedAt: now,
    });
    await clearPendingAdjustment();
    setPending(null);
  }, [pending]);

  const reject = useCallback(async () => {
    await clearPendingAdjustment();
    setPending(null);
  }, []);

  return { pending, apply, reject };
}
