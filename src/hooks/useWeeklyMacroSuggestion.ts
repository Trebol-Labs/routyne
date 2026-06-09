'use client';

import { useCallback, useEffect, useState } from 'react';
import { NUTRITION_ENABLED } from '@/lib/feature-flags';
import { loadAllBodyweight } from '@/lib/db/bodyweight';
import {
  isSuggestionCooldownPassed,
  saveSuggestionDismissedAt,
} from '@/lib/db/macroSuggestion';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  analyzeWeeklyTrend,
  applyCalorieDelta,
  weeklyAverages as buildWeeklyAverages,
  type WeeklyAverage,
  type WeeklyTrendAnalysis,
} from '@/lib/nutrition/weeklyAdjustment';
import type { NutritionGoal } from '@/types/workout';

interface UseWeeklyMacroSuggestionResult {
  suggestion: WeeklyTrendAnalysis | null;
  weeklyAverages: WeeklyAverage[];
  apply: () => Promise<void>;
  dismiss: () => Promise<void>;
}

export function useWeeklyMacroSuggestion(
  goal: NutritionGoal,
  refreshKey: number | string,
): UseWeeklyMacroSuggestionResult {
  const updateNutritionGoal = useWorkoutStore((state) => state.updateNutritionGoal);
  const [suggestion, setSuggestion] = useState<WeeklyTrendAnalysis | null>(null);
  const [weeklyAverages, setWeeklyAverages] = useState<WeeklyAverage[]>([]);

  useEffect(() => {
    if (!NUTRITION_ENABLED) return;

    let cancelled = false;

    (async () => {
      const bodyweight = await loadAllBodyweight();
      const averages = buildWeeklyAverages(bodyweight);
      if (cancelled) return;

      setWeeklyAverages(averages);

      if (!goal.phase) {
        setSuggestion(null);
        return;
      }

      const cooldownPassed = await isSuggestionCooldownPassed();
      if (cancelled) return;
      if (!cooldownPassed) {
        setSuggestion(null);
        return;
      }

      const analysis = analyzeWeeklyTrend({
        phase: goal.phase,
        weights: bodyweight,
        currentCalories: goal.calories,
      });
      if (cancelled) return;

      if (analysis.status === 'stalled' || analysis.status === 'too_fast') {
        setSuggestion(analysis);
      } else {
        setSuggestion(null);
      }
    })().catch((error) => {
      console.error('[useWeeklyMacroSuggestion] analysis failed', error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    goal.calories,
    goal.carbsGrams,
    goal.fatGrams,
    goal.phase,
    goal.proteinGrams,
    refreshKey,
  ]);

  const apply = useCallback(async () => {
    if (!suggestion) return;

    await updateNutritionGoal(applyCalorieDelta(goal, suggestion.deltaKcal));
    await saveSuggestionDismissedAt();
    setSuggestion(null);
  }, [goal, suggestion, updateNutritionGoal]);

  const dismiss = useCallback(async () => {
    await saveSuggestionDismissedAt();
    setSuggestion(null);
  }, []);

  return { suggestion, weeklyAverages, apply, dismiss };
}
