import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_FACTORS,
  buildMealPlan,
  calcBmr,
  calcMacros,
  calcTargetKcal,
  calcTdee,
  computeAll,
} from './calculations';
import type { ActivityLevel, NutritionGoal } from '@/types/nutrition';

describe('calcBmr', () => {
  it('uses Mifflin-St Jeor for males without bodyFat', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(calcBmr({ weightKg: 80, heightCm: 180, ageYears: 30, sex: 'male', bodyFatPct: null })).toBe(1780);
  });

  it('uses Mifflin-St Jeor for females', () => {
    // 10*60 + 6.25*165 - 5*28 - 161 = 1330.25 → 1330
    expect(calcBmr({ weightKg: 60, heightCm: 165, ageYears: 28, sex: 'female', bodyFatPct: null })).toBe(1330);
  });

  it('uses Katch-McArdle when bodyFat is in (0,60)', () => {
    // LBM = 80 * 0.85 = 68; 370 + 21.6*68 = 1838.8 → 1839
    expect(calcBmr({ weightKg: 80, heightCm: 180, ageYears: 30, sex: 'male', bodyFatPct: 15 })).toBe(1839);
  });

  it('falls back to Mifflin when bodyFat is 0', () => {
    expect(calcBmr({ weightKg: 80, heightCm: 180, ageYears: 30, sex: 'male', bodyFatPct: 0 })).toBe(1780);
  });

  it('falls back to Mifflin when bodyFat ≥ 60', () => {
    expect(calcBmr({ weightKg: 80, heightCm: 180, ageYears: 30, sex: 'male', bodyFatPct: 60 })).toBe(1780);
  });
});

describe('calcTdee', () => {
  it('multiplies by every activity factor', () => {
    const bmr = 1780;
    (Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).forEach((level) => {
      expect(calcTdee(bmr, level)).toBe(Math.round(bmr * ACTIVITY_FACTORS[level]));
    });
  });
});

describe('calcTargetKcal', () => {
  it('bulk + beginner = tdee × 1.15', () => {
    expect(calcTargetKcal(2760, 'bulk', 'beginner')).toBe(Math.round(2760 * 1.15));
  });

  it('bulk + intermediate = tdee × 1.10', () => {
    expect(calcTargetKcal(2760, 'bulk', 'intermediate')).toBe(Math.round(2760 * 1.10));
  });

  it('bulk + advanced = tdee × 1.06', () => {
    expect(calcTargetKcal(2760, 'bulk', 'advanced')).toBe(Math.round(2760 * 1.06));
  });

  it('cut subtracts 400 kcal', () => {
    expect(calcTargetKcal(2760, 'cut', 'intermediate')).toBe(2360);
  });

  it('recomp subtracts 100 kcal', () => {
    expect(calcTargetKcal(2760, 'recomp', 'intermediate')).toBe(2660);
  });
});

describe('calcMacros', () => {
  it('protein ratio differs by goal', () => {
    expect(calcMacros({ weightKg: 80, targetKcal: 2760, goal: 'bulk' }).proteinG).toBe(160);
    expect(calcMacros({ weightKg: 80, targetKcal: 2760, goal: 'recomp' }).proteinG).toBe(160);
    expect(calcMacros({ weightKg: 80, targetKcal: 2360, goal: 'cut' }).proteinG).toBe(176);
  });

  it('total kcal stays within 20 kcal of target', () => {
    const m = calcMacros({ weightKg: 80, targetKcal: 2760, goal: 'bulk' });
    const total = m.proteinKcal + m.fatsKcal + m.carbsKcal;
    expect(Math.abs(total - 2760)).toBeLessThanOrEqual(20);
  });

  it('respects fat floor of 0.9 g/kg', () => {
    const m = calcMacros({ weightKg: 80, targetKcal: 1500, goal: 'cut' });
    expect(m.fatsG).toBeGreaterThanOrEqual(72);
  });

  it('clamps carbs at 0 when target is too low', () => {
    const m = calcMacros({ weightKg: 80, targetKcal: 800, goal: 'cut' });
    expect(m.carbsG).toBeGreaterThanOrEqual(0);
  });
});

describe('buildMealPlan', () => {
  const baseMacros = { proteinG: 160, fatsG: 90, carbsG: 350, proteinKcal: 640, fatsKcal: 810, carbsKcal: 1400 };

  it('uses 5 meals when protein/4 exceeds 0.55 g/kg', () => {
    // weightKg 60 → max per meal 33; protein 200 → 50 per meal of 4 → forces 5
    const plan = buildMealPlan({
      weightKg: 60,
      macros: { ...baseMacros, proteinG: 200 },
      trainingTime: null,
    });
    expect(plan.meals.length).toBe(5);
  });

  it('uses 4 meals for typical-sized users', () => {
    const plan = buildMealPlan({
      weightKg: 80,
      macros: baseMacros,
      trainingTime: null,
    });
    expect(plan.meals.length).toBe(4);
  });

  it('places pre/post slots when training time is set', () => {
    const plan = buildMealPlan({
      weightKg: 80,
      macros: baseMacros,
      trainingTime: 'morning',
    });
    const slots = plan.meals.map((m) => m.slot);
    expect(slots).toContain('pre_workout');
    expect(slots).toContain('post_workout');
  });

  it('falls back to standard slots when trainingTime is null', () => {
    const plan = buildMealPlan({
      weightKg: 80,
      macros: baseMacros,
      trainingTime: null,
    });
    expect(plan.meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
  });

  it('builds plans for afternoon and evening too', () => {
    const afternoon = buildMealPlan({ weightKg: 80, macros: baseMacros, trainingTime: 'afternoon' });
    const evening = buildMealPlan({ weightKg: 80, macros: baseMacros, trainingTime: 'evening' });
    expect(afternoon.meals.some((m) => m.slot === 'pre_workout')).toBe(true);
    expect(evening.meals.some((m) => m.slot === 'post_workout')).toBe(true);
  });

  it('produces a 5-meal evening plan when protein per meal is high', () => {
    const plan = buildMealPlan({
      weightKg: 60,
      macros: { ...baseMacros, proteinG: 200 },
      trainingTime: 'evening',
    });
    expect(plan.meals.length).toBe(5);
  });

  it('totals sum across meals', () => {
    const plan = buildMealPlan({ weightKg: 80, macros: baseMacros, trainingTime: 'morning' });
    const sumP = plan.meals.reduce((a, m) => a + m.proteinG, 0);
    expect(plan.totalProteinG).toBe(sumP);
  });
});

describe('computeAll', () => {
  const baseArgs = {
    weightKg: 80,
    heightCm: 180,
    ageYears: 30,
    sex: 'male' as const,
    bodyFatPct: null,
    activityLevel: 'moderate' as const,
    goal: 'bulk' as NutritionGoal,
    experience: 'intermediate' as const,
    trainingTime: null,
  };

  it('returns full pipeline result', () => {
    const r = computeAll(baseArgs);
    expect(r.bmrKcal).toBe(1780);
    expect(r.tdeeKcal).toBe(2759);
    expect(r.targetKcal).toBe(Math.round(2759 * 1.10));
    expect(r.macros.proteinG).toBe(160);
    expect(r.mealPlan.meals.length).toBeGreaterThan(0);
  });

  it('warns when BMI is high', () => {
    const r = computeAll({ ...baseArgs, weightKg: 110, heightCm: 170 });
    expect(r.warnings).toContain('warning.high_bmi_estimation_error');
  });

  it('warns on aggressive cut deficit', () => {
    const r = computeAll({
      ...baseArgs,
      activityLevel: 'sedentary',
      goal: 'cut',
    });
    expect(r.warnings).toContain('warning.aggressive_deficit');
  });

  it('warns when bodyFat is out of range', () => {
    const r = computeAll({ ...baseArgs, bodyFatPct: 2 });
    expect(r.warnings).toContain('warning.bodyfat_out_of_range');
  });

  it('warns on low carbs for non-cut goals', () => {
    const r = computeAll({ ...baseArgs, weightKg: 100, activityLevel: 'sedentary', goal: 'recomp' });
    expect(r.warnings).toContain('warning.low_carbs');
  });
});
