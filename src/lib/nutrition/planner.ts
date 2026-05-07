import type { ExperienceLevel } from '@/types/workout';

export type NutritionPlanGoal = 'cut' | 'gain' | 'recomp';

export interface NutritionPlanInput {
  goal: NutritionPlanGoal;
  experienceLevel: ExperienceLevel;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  targetWeight: number;
  weeks: number;
}

export interface NutritionPlanRecommendation {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  maintenanceCalories: number;
  weeklyRatePercent: number;
  recommendedWeeksMin: number;
  recommendedWeeksMax: number;
  isWithinRecommendedRange: boolean;
  paceLabel: 'conservador' | 'recomendado' | 'agresivo';
  summary: string;
  evidence: string[];
}

type RateRange = {
  min: number;
  max: number;
};

const CUT_RATES: Record<ExperienceLevel, RateRange> = {
  beginner: { min: 0.25, max: 0.75 },
  intermediate: { min: 0.4, max: 0.9 },
  advanced: { min: 0.25, max: 0.6 },
};

const GAIN_RATES: Record<ExperienceLevel, RateRange> = {
  beginner: { min: 0.25, max: 0.5 },
  intermediate: { min: 0.15, max: 0.35 },
  advanced: { min: 0.1, max: 0.25 },
};

const RECOMP_WEEKS: Record<ExperienceLevel, RateRange> = {
  beginner: { min: 8, max: 16 },
  intermediate: { min: 12, max: 24 },
  advanced: { min: 16, max: 32 },
};

const KCAL_PER_KG_WEIGHT_CHANGE = 7700;
const STARTER_MAINTENANCE_KCAL_PER_KG = 33;
const RECOMP_CALORIE_FACTOR = 0.98;
const FAT_GRAMS_PER_KG = 0.8;
const CUT_PROTEIN_GRAMS_PER_KG = 2.2;
const GAIN_PROTEIN_GRAMS_PER_KG = 1.9;
const RECOMP_PROTEIN_GRAMS_PER_KG = 2.1;
const MIN_DAILY_CALORIE_DELTA = 100;
const MAX_CUT_DAILY_DEFICIT = 900;
const MAX_GAIN_DAILY_SURPLUS = 500;

function toKg(weight: number, unit: 'kg' | 'lbs'): number {
  return unit === 'kg' ? weight : weight * 0.45359237;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function getMaintenanceCalories(weightKg: number): number {
  return roundToNearest(weightKg * STARTER_MAINTENANCE_KCAL_PER_KG, 25);
}

function getRecommendedWeeks(
  goal: NutritionPlanGoal,
  experienceLevel: ExperienceLevel,
  currentWeight: number,
  targetWeight: number,
): { min: number; max: number } {
  if (goal === 'recomp') {
    const range = RECOMP_WEEKS[experienceLevel];
    return { min: range.min, max: range.max };
  }

  const rates = goal === 'cut' ? CUT_RATES[experienceLevel] : GAIN_RATES[experienceLevel];
  const change = Math.abs(targetWeight - currentWeight);
  if (currentWeight <= 0 || change <= 0) return { min: 0, max: 0 };

  const fastestWeeks = change / (currentWeight * (rates.max / 100));
  const slowestWeeks = change / (currentWeight * (rates.min / 100));

  return {
    min: Math.ceil(fastestWeeks),
    max: Math.ceil(slowestWeeks),
  };
}

function getPaceLabel(weeklyRatePercent: number, range: RateRange): NutritionPlanRecommendation['paceLabel'] {
  if (weeklyRatePercent < range.min) return 'conservador';
  if (weeklyRatePercent > range.max) return 'agresivo';
  return 'recomendado';
}

export function buildNutritionPlanRecommendation(input: NutritionPlanInput): NutritionPlanRecommendation | null {
  const weightKg = toKg(input.weight, input.weightUnit);
  const targetWeightKg = toKg(input.targetWeight, input.weightUnit);
  const weeks = Math.max(1, Math.round(input.weeks));

  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(weeks)) {
    return null;
  }

  const maintenanceCalories = getMaintenanceCalories(weightKg);
  const recommendedWeeks = getRecommendedWeeks(input.goal, input.experienceLevel, weightKg, targetWeightKg);

  if (input.goal === 'recomp') {
    const proteinGrams = Math.round(weightKg * RECOMP_PROTEIN_GRAMS_PER_KG);
    const fatGrams = Math.round(weightKg * FAT_GRAMS_PER_KG);
    const calories = roundToNearest(maintenanceCalories * RECOMP_CALORIE_FACTOR, 25);
    const carbsGrams = Math.max(0, Math.round((calories - proteinGrams * 4 - fatGrams * 9) / 4));
    const isWithinRecommendedRange = weeks >= recommendedWeeks.min && weeks <= recommendedWeeks.max;

    return {
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      maintenanceCalories,
      weeklyRatePercent: 0,
      recommendedWeeksMin: recommendedWeeks.min,
      recommendedWeeksMax: recommendedWeeks.max,
      isWithinRecommendedRange,
      paceLabel: isWithinRecommendedRange ? 'recomendado' : weeks < recommendedWeeks.min ? 'agresivo' : 'conservador',
      summary: 'Recomposición: calorías cerca de mantenimiento, proteína alta y progreso medido por fuerza, medidas y fotos.',
      evidence: [
        'ISSN protein position stand: 1.4-2.0 g/kg/day supports training adaptation; higher protein is commonly used in hypocaloric or body-composition phases.',
        'Recomposition is treated as a maintenance-calorie phase because target scale-weight change is not the primary outcome.',
      ],
    };
  }

  if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0 || targetWeightKg === weightKg) {
    return null;
  }

  const direction = input.goal === 'cut' ? -1 : 1;
  const rawDeltaKg = Math.abs(targetWeightKg - weightKg);
  const weeklyRatePercent = (rawDeltaKg / weeks / weightKg) * 100;
  const kcalDelta = (rawDeltaKg * KCAL_PER_KG_WEIGHT_CHANGE) / (weeks * 7);
  const calorieDelta = clamp(
    kcalDelta,
    MIN_DAILY_CALORIE_DELTA,
    input.goal === 'cut' ? MAX_CUT_DAILY_DEFICIT : MAX_GAIN_DAILY_SURPLUS,
  );
  const calories = roundToNearest(maintenanceCalories + direction * calorieDelta, 25);
  const proteinMultiplier = input.goal === 'cut' ? CUT_PROTEIN_GRAMS_PER_KG : GAIN_PROTEIN_GRAMS_PER_KG;
  const proteinGrams = Math.round(weightKg * proteinMultiplier);
  const fatGrams = Math.round(weightKg * FAT_GRAMS_PER_KG);
  const carbsGrams = Math.max(0, Math.round((calories - proteinGrams * 4 - fatGrams * 9) / 4));
  const rateRange = input.goal === 'cut' ? CUT_RATES[input.experienceLevel] : GAIN_RATES[input.experienceLevel];
  const paceLabel = getPaceLabel(weeklyRatePercent, rateRange);

  return {
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    maintenanceCalories,
    weeklyRatePercent,
    recommendedWeeksMin: recommendedWeeks.min,
    recommendedWeeksMax: recommendedWeeks.max,
    isWithinRecommendedRange: paceLabel === 'recomendado',
    paceLabel,
    summary: input.goal === 'cut'
      ? 'Pérdida de grasa: déficit calculado por tiempo objetivo y proteína alta para preservar masa muscular.'
      : 'Ganancia muscular: superávit controlado para subir con el menor aumento de grasa posible.',
    evidence: [
      'Energy target uses a 7700 kcal/kg first-pass energy-density estimate, capped because NIH/NIDDK dynamic body-weight models show fixed calorie rules overpredict real change over time.',
      'ISSN protein position stand supports 1.4-2.0 g/kg/day for exercising people; cutting uses a higher body-composition target to bias lean-mass retention.',
    ],
  };
}
