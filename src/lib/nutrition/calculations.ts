// Pure nutrition science engine. No side effects, no DB, no React.
// Reference: docs/nutrition.md.

import type {
  ActivityLevel,
  BiologicalSex,
  MealPlan,
  MealPlanEntry,
  MealSlot,
  NutritionExperience,
  NutritionGoal,
  TrainingTime,
} from '@/types/nutrition';

// ── BMR ──────────────────────────────────────────────────────────────────────

export function calcBmr(args: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
  bodyFatPct: number | null;
}): number {
  const { weightKg, heightCm, ageYears, sex, bodyFatPct } = args;
  if (bodyFatPct != null && bodyFatPct > 0 && bodyFatPct < 60) {
    const lbm = weightKg * (1 - bodyFatPct / 100);
    return Math.round(370 + 21.6 * lbm);
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

// ── TDEE ─────────────────────────────────────────────────────────────────────

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export function calcTdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity]);
}

// ── Target calories ──────────────────────────────────────────────────────────

const SURPLUS_PCT_BY_EXPERIENCE: Record<NutritionExperience, number> = {
  beginner: 0.15,
  intermediate: 0.10,
  advanced: 0.06,
};

export function calcTargetKcal(
  tdee: number,
  goal: NutritionGoal,
  experience: NutritionExperience,
): number {
  switch (goal) {
    case 'bulk':
      return Math.round(tdee * (1 + SURPLUS_PCT_BY_EXPERIENCE[experience]));
    case 'cut':
      return tdee - 400;
    case 'recomp':
      return tdee - 100;
  }
}

// ── Macros ───────────────────────────────────────────────────────────────────

export interface Macros {
  proteinG: number;
  fatsG: number;
  carbsG: number;
  proteinKcal: number;
  fatsKcal: number;
  carbsKcal: number;
}

export function kcalFromMacros(proteinG: number, carbsG: number, fatsG: number): number {
  return proteinG * 4 + carbsG * 4 + fatsG * 9;
}

const PROTEIN_RATIO_BY_GOAL: Record<NutritionGoal, number> = {
  recomp: 2.0,
  bulk: 2.0,
  cut: 2.2,
};

export function calcMacros(args: {
  weightKg: number;
  targetKcal: number;
  goal: NutritionGoal;
}): Macros {
  const { weightKg, targetKcal, goal } = args;
  const proteinG = Math.round(weightKg * PROTEIN_RATIO_BY_GOAL[goal]);
  const proteinKcal = proteinG * 4;

  const fatsFloor = Math.round(weightKg * 0.9);
  const fatsByPct = Math.round((targetKcal * 0.20) / 9);
  const fatsG = Math.max(fatsFloor, fatsByPct);
  const fatsKcal = fatsG * 9;

  const remainingKcal = targetKcal - proteinKcal - fatsKcal;
  const carbsG = Math.max(0, Math.round(remainingKcal / 4));
  const carbsKcal = carbsG * 4;

  return { proteinG, fatsG, carbsG, proteinKcal, fatsKcal, carbsKcal };
}

// ── Meal plan ────────────────────────────────────────────────────────────────

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Desayuno',
  pre_workout: 'Pre-entreno',
  post_workout: 'Post-entreno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
  casein: 'Caseína',
};

function pickSlots(trainingTime: TrainingTime | null, mealCount: 4 | 5): MealSlot[] {
  if (trainingTime === 'morning') {
    return mealCount === 5
      ? ['pre_workout', 'post_workout', 'lunch', 'snack', 'dinner']
      : ['pre_workout', 'post_workout', 'lunch', 'dinner'];
  }
  if (trainingTime === 'afternoon') {
    return mealCount === 5
      ? ['breakfast', 'pre_workout', 'post_workout', 'dinner', 'casein']
      : ['breakfast', 'pre_workout', 'post_workout', 'dinner'];
  }
  if (trainingTime === 'evening') {
    return mealCount === 5
      ? ['breakfast', 'lunch', 'pre_workout', 'post_workout', 'casein']
      : ['breakfast', 'lunch', 'pre_workout', 'post_workout'];
  }
  return mealCount === 5
    ? ['breakfast', 'lunch', 'snack', 'dinner', 'casein']
    : ['breakfast', 'lunch', 'snack', 'dinner'];
}

function distributeMacros(args: {
  slots: MealSlot[];
  macros: Macros;
  weightKg: number;
}): MealPlanEntry[] {
  const { slots, macros, weightKg } = args;
  const n = slots.length;

  // Protein: equitable, with post-workout absorbing the remainder.
  const baseProtein = Math.floor(macros.proteinG / n);
  const proteinRemainder = macros.proteinG - baseProtein * n;
  const proteinPerSlot = slots.map(() => baseProtein);
  const postIdx = slots.indexOf('post_workout');
  const dumpIdx = postIdx >= 0 ? postIdx : n - 1;
  proteinPerSlot[dumpIdx] += proteinRemainder;

  // Carbs: 35% post-workout, 25% pre-workout, rest spread evenly.
  const carbWeights: number[] = slots.map((slot) => {
    if (slot === 'post_workout') return 0.35;
    if (slot === 'pre_workout') return 0.25;
    return 0;
  });
  const allocatedCarbsRatio = carbWeights.reduce((a, b) => a + b, 0);
  const remainingCarbsRatio = 1 - allocatedCarbsRatio;
  const nonPriority = slots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s !== 'post_workout' && s !== 'pre_workout');
  const perOther = nonPriority.length > 0 ? remainingCarbsRatio / nonPriority.length : 0;
  for (const { i } of nonPriority) carbWeights[i] = perOther;
  const carbsPerSlot = carbWeights.map((w) => Math.round(macros.carbsG * w));

  // Fats: avoid pre/post-workout (slow digestion); concentrate on main meals.
  const fatWeights = slots.map((slot) => {
    if (slot === 'pre_workout' || slot === 'post_workout') return 0.05;
    return 1;
  });
  const fatTotal = fatWeights.reduce((a, b) => a + b, 0);
  const fatsPerSlot = fatWeights.map((w) => Math.round(macros.fatsG * (w / fatTotal)));

  return slots.map((slot, i) => {
    const protein = proteinPerSlot[i];
    const carbs = carbsPerSlot[i];
    const fats = fatsPerSlot[i];
    return {
      slot,
      label: SLOT_LABELS[slot],
      proteinG: protein,
      carbsG: carbs,
      fatsG: fats,
      kcal: protein * 4 + carbs * 4 + fats * 9,
      notes: slot === 'pre_workout' && weightKg ? undefined : undefined,
    };
  });
}

export function buildMealPlan(args: {
  weightKg: number;
  macros: Macros;
  trainingTime: TrainingTime | null;
  preferredMealCount?: 4 | 5;
}): MealPlan {
  const { weightKg, macros, trainingTime, preferredMealCount = 4 } = args;

  const minPerMeal = 0.4 * weightKg;
  const maxPerMeal = 0.55 * weightKg;

  let mealCount: 4 | 5 = preferredMealCount;
  const protPer4 = macros.proteinG / 4;
  if (protPer4 > maxPerMeal) mealCount = 5;
  else if (protPer4 < minPerMeal && mealCount > 4) mealCount = 4;

  const slots = pickSlots(trainingTime, mealCount);
  const meals = distributeMacros({ slots, macros, weightKg });

  const total = meals.reduce(
    (acc, m) => ({
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatsG: acc.fatsG + m.fatsG,
      kcal: acc.kcal + m.kcal,
    }),
    { proteinG: 0, carbsG: 0, fatsG: 0, kcal: 0 },
  );

  return {
    meals,
    totalProteinG: total.proteinG,
    totalCarbsG: total.carbsG,
    totalFatsG: total.fatsG,
    totalKcal: total.kcal,
  };
}

// ── computeAll ───────────────────────────────────────────────────────────────

export interface ComputeAllArgs {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
  bodyFatPct: number | null;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  experience: NutritionExperience;
  trainingTime: TrainingTime | null;
}

export interface ComputeAllResult {
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  macros: Macros;
  mealPlan: MealPlan;
  warnings: string[];
}

export function computeAll(args: ComputeAllArgs): ComputeAllResult {
  const warnings: string[] = [];
  const bmi = args.weightKg / Math.pow(args.heightCm / 100, 2);
  if (bmi >= 30) warnings.push('warning.high_bmi_estimation_error');
  if (args.bodyFatPct != null && (args.bodyFatPct < 3 || args.bodyFatPct > 50)) {
    warnings.push('warning.bodyfat_out_of_range');
  }

  const bmrKcal = calcBmr(args);
  const tdeeKcal = calcTdee(bmrKcal, args.activityLevel);
  const targetKcal = calcTargetKcal(tdeeKcal, args.goal, args.experience);

  if (args.goal === 'cut' && targetKcal < bmrKcal * 1.1) {
    warnings.push('warning.aggressive_deficit');
  }

  const macros = calcMacros({ weightKg: args.weightKg, targetKcal, goal: args.goal });

  if (args.goal !== 'cut' && macros.carbsG < args.weightKg * 2) {
    warnings.push('warning.low_carbs');
  }

  const mealPlan = buildMealPlan({
    weightKg: args.weightKg,
    macros,
    trainingTime: args.trainingTime,
  });

  return { bmrKcal, tdeeKcal, targetKcal, macros, mealPlan, warnings };
}
