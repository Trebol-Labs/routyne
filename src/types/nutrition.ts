// Types for the nutrition coach (profile, plan, logs, adjustments).
// Matches docs/nutrition/03-data-model.md.

export type BiologicalSex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extra_active';

export type NutritionGoal = 'bulk' | 'cut' | 'recomp';

export type NutritionExperience = 'beginner' | 'intermediate' | 'advanced';

export type TrainingTime = 'morning' | 'afternoon' | 'evening';

export type TrainingType = 'strength' | 'hypertrophy' | 'cardio' | 'mixed';

export type Budget = 'low' | 'medium' | 'high';

export type DietaryRestriction =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'gluten_free'
  | 'lactose_free'
  | 'nut_free'
  | 'halal'
  | 'kosher'
  | 'low_fodmap';

export type MealSlot =
  | 'breakfast'
  | 'pre_workout'
  | 'post_workout'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'casein';

export interface NutritionProfile {
  // Tier 1
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  experience: NutritionExperience;

  // Tier 2 (optional)
  bodyFatPct: number | null;
  trainingDaysPerWeek: number | null;
  trainingType: TrainingType | null;
  trainingTime: TrainingTime | null;
  dietaryRestrictions: DietaryRestriction[];
  customRestrictions: string[];
  budget: Budget | null;

  // Computed cache
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  proteinG: number;
  fatsG: number;
  carbsG: number;

  createdAt: string;
  updatedAt: string;
}

export interface MealPlanEntry {
  slot: MealSlot;
  label: string;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  kcal: number;
  notes?: string;
}

export interface MealPlan {
  meals: MealPlanEntry[];
  totalProteinG: number;
  totalCarbsG: number;
  totalFatsG: number;
  totalKcal: number;
}

export type NutritionProfilePatch = Partial<NutritionProfile>;
