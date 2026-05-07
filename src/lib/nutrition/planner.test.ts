import { describe, expect, it } from 'vitest';
import { buildNutritionPlanRecommendation } from './planner';

// Reference basis protected by these expectations:
// - ISSN protein position stand: 1.4-2.0 g/kg/day for exercising people, with higher targets commonly used in body-composition phases.
// - NIH/NIDDK Hall body-weight dynamics: static 7700 kcal/kg math is only a starting estimate, so the implementation caps aggressive daily deltas.
// - Experience-based weekly pace ranges are intentionally conservative so beginners get guardrails before exact kcal targets.

describe('buildNutritionPlanRecommendation', () => {
  it('calculates a beginner fat-loss block from time-to-goal with a recommended pace', () => {
    const plan = buildNutritionPlanRecommendation({
      goal: 'cut',
      experienceLevel: 'beginner',
      weight: 80,
      weightUnit: 'kg',
      targetWeight: 74,
      weeks: 12,
    });

    expect(plan).toMatchObject({
      calories: 2100,
      proteinGrams: 176,
      fatGrams: 64,
      carbsGrams: 205,
      maintenanceCalories: 2650,
      recommendedWeeksMin: 10,
      recommendedWeeksMax: 30,
      isWithinRecommendedRange: true,
      paceLabel: 'recomendado',
    });
    expect(plan?.weeklyRatePercent).toBeCloseTo(0.625, 3);
  });

  it('calculates a controlled lean-gain block for an intermediate user', () => {
    const plan = buildNutritionPlanRecommendation({
      goal: 'gain',
      experienceLevel: 'intermediate',
      weight: 70,
      weightUnit: 'kg',
      targetWeight: 74.2,
      weeks: 20,
    });

    expect(plan).toMatchObject({
      calories: 2525,
      proteinGrams: 133,
      fatGrams: 56,
      carbsGrams: 372,
      maintenanceCalories: 2300,
      recommendedWeeksMin: 18,
      recommendedWeeksMax: 41,
      isWithinRecommendedRange: true,
      paceLabel: 'recomendado',
    });
    expect(plan?.weeklyRatePercent).toBeCloseTo(0.3, 3);
  });

  it('flags an advanced fat-loss target as aggressive and caps the daily deficit', () => {
    const plan = buildNutritionPlanRecommendation({
      goal: 'cut',
      experienceLevel: 'advanced',
      weight: 90,
      weightUnit: 'kg',
      targetWeight: 80,
      weeks: 8,
    });

    expect(plan).toMatchObject({
      calories: 2075,
      proteinGrams: 198,
      fatGrams: 72,
      carbsGrams: 159,
      maintenanceCalories: 2975,
      recommendedWeeksMin: 19,
      recommendedWeeksMax: 45,
      isWithinRecommendedRange: false,
      paceLabel: 'agresivo',
    });
    expect(plan?.weeklyRatePercent).toBeCloseTo(1.389, 3);
  });

  it('uses maintenance-style calories for recomposition and supports lbs inputs', () => {
    const plan = buildNutritionPlanRecommendation({
      goal: 'recomp',
      experienceLevel: 'beginner',
      weight: 180,
      weightUnit: 'lbs',
      targetWeight: 180,
      weeks: 12,
    });

    expect(plan).toMatchObject({
      calories: 2650,
      proteinGrams: 171,
      fatGrams: 65,
      carbsGrams: 345,
      maintenanceCalories: 2700,
      recommendedWeeksMin: 8,
      recommendedWeeksMax: 16,
      isWithinRecommendedRange: true,
      paceLabel: 'recomendado',
    });
    expect(plan?.weeklyRatePercent).toBe(0);
  });

  it('returns null when required weight inputs cannot support a kcal recommendation', () => {
    expect(buildNutritionPlanRecommendation({
      goal: 'cut',
      experienceLevel: 'beginner',
      weight: 0,
      weightUnit: 'kg',
      targetWeight: 70,
      weeks: 12,
    })).toBeNull();

    expect(buildNutritionPlanRecommendation({
      goal: 'gain',
      experienceLevel: 'intermediate',
      weight: 80,
      weightUnit: 'kg',
      targetWeight: 80,
      weeks: 12,
    })).toBeNull();
  });
});
