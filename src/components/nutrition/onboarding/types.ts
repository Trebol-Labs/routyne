import type {
  ActivityLevel,
  BiologicalSex,
  Budget,
  DietaryRestriction,
  NutritionExperience,
  NutritionGoal,
  TrainingTime,
  TrainingType,
} from '@/types/nutrition';

export interface OnboardingDraft {
  // Tier 1
  sex: BiologicalSex | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: NutritionGoal | null;
  experience: NutritionExperience | null;

  // Tier 2
  bodyFatPct: number | null;
  trainingDaysPerWeek: number | null;
  trainingType: TrainingType | null;
  trainingTime: TrainingTime | null;
  dietaryRestrictions: DietaryRestriction[];
  customRestrictions: string[];
  budget: Budget | null;
}

export const EMPTY_DRAFT: OnboardingDraft = {
  sex: null,
  ageYears: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  goal: null,
  experience: null,
  bodyFatPct: null,
  trainingDaysPerWeek: null,
  trainingType: null,
  trainingTime: null,
  dietaryRestrictions: [],
  customRestrictions: [],
  budget: null,
};

export function isBasicsValid(d: OnboardingDraft): boolean {
  return (
    d.sex !== null &&
    d.ageYears !== null &&
    d.ageYears >= 14 &&
    d.ageYears <= 90 &&
    d.heightCm !== null &&
    d.heightCm > 50 &&
    d.heightCm < 250 &&
    d.weightKg !== null &&
    d.weightKg > 25 &&
    d.weightKg < 300
  );
}

export function isGoalValid(d: OnboardingDraft): boolean {
  return d.activityLevel !== null && d.goal !== null && d.experience !== null;
}
