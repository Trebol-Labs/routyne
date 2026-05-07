/**
 * Builds the user context object sent to the AI Coach API route.
 * Pulls from IDB-backed history and profile — no network calls.
 */

import { estimate1RM } from '@/lib/progression/engine';
import { getMuscleGroupVolume } from '@/lib/analytics/muscle-map';
import type { HistoryEntry, UserProfile, ExerciseVolume, NutritionGoal } from '@/types/workout';

export interface CoachTopExercise {
  name: string;
  setsCompleted: number;
  totalVolume: number;
  estimated1RM: number | null;
}

export interface CoachRecentSession {
  sessionTitle: string;
  completedAt: string;
  totalVolume: number;
  durationMinutes: number;
  topExercises: CoachTopExercise[];
  newPRNames: string[];
}

export interface CoachPersonalRecord {
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  estimated1RM: number;
}

export interface CoachMuscleWeek {
  muscle: string;
  sets: number;
}

export interface UserCoachContext {
  profile: {
    displayName: string;
    weightUnit: 'kg' | 'lbs';
    trainingGoal: string;
    experienceLevel: string;
    coachTone: string;
    effortTracking: string;
    language: 'es' | 'en';
    timezone: string;
  };
  recentSessions: CoachRecentSession[];
  personalRecords: CoachPersonalRecord[];
  weeklyMuscleVolume: CoachMuscleWeek[];
  nutritionGoal: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    updatedAt: string;
  } | null;
  streakDays: number;
  totalWorkouts: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeStreak(history: HistoryEntry[]): number {
  const days = new Set(history.map((e) => new Date(e.completedAt).toDateString()));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const start = days.has(today.toDateString())
    ? new Date(today)
    : days.has(yesterday.toDateString())
      ? new Date(yesterday)
      : null;
  if (!start) return 0;
  let streak = 0;
  const d = new Date(start);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getBestEstimated1RM(vol: ExerciseVolume): number | null {
  if (!vol.setDetails?.length) return null;
  let best = 0;
  for (const sd of vol.setDetails) {
    if (sd.weight && sd.weight > 0 && sd.repsDone > 0 && sd.setType !== 'warmup') {
      const rm = estimate1RM(sd.weight, sd.repsDone);
      if (rm > best) best = rm;
    }
  }
  return best > 0 ? Math.round(best * 10) / 10 : null;
}

function computePRs(history: HistoryEntry[]): CoachPersonalRecord[] {
  // Map<exerciseName, best 1RM>
  const best = new Map<string, { maxWeight: number; maxReps: number; est1RM: number }>();

  for (const entry of history) {
    for (const vol of entry.volumeData) {
      const name = vol.cleanName.trim().toLowerCase();
      for (const sd of vol.setDetails ?? []) {
        if (!sd.weight || sd.weight <= 0 || sd.repsDone <= 0 || sd.setType === 'warmup') continue;
        const est1RM = estimate1RM(sd.weight, sd.repsDone);
        const current = best.get(name);
        if (!current || est1RM > current.est1RM) {
          best.set(name, { maxWeight: sd.weight, maxReps: sd.repsDone, est1RM });
        }
      }
    }
  }

  return Array.from(best.entries())
    .sort((a, b) => b[1].est1RM - a[1].est1RM)
    .slice(0, 10)
    .map(([name, data]) => ({
      exerciseName: name,
      maxWeight: data.maxWeight,
      maxReps: data.maxReps,
      estimated1RM: Math.round(data.est1RM * 10) / 10,
    }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildUserContext(
  history: HistoryEntry[],
  profile: UserProfile,
  nutritionGoal?: NutritionGoal,
): UserCoachContext {
  const recent = history.slice(0, 10);
  const language = profile.preferences.language;
  const timezone = profile.preferences.timezone;

  const recentSessions: CoachRecentSession[] = recent.map((h) => ({
    sessionTitle: h.sessionTitle,
    completedAt: new Date(h.completedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric', month: 'short',
    }),
    totalVolume: Math.round(h.totalVolume),
    durationMinutes: h.durationSeconds ? Math.round(h.durationSeconds / 60) : 0,
    topExercises: h.volumeData
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 4)
      .map((vol) => ({
        name: vol.cleanName,
        setsCompleted: vol.setsCompleted,
        totalVolume: Math.round(vol.totalVolume),
        estimated1RM: getBestEstimated1RM(vol),
      })),
    newPRNames: [], // populated via PR cross-reference below if needed
  }));

  const muscleWeek = getMuscleGroupVolume(history, 7);

  return {
    profile: {
      displayName: profile.displayName,
      weightUnit: profile.weightUnit,
      trainingGoal: profile.preferences.trainingGoal,
      experienceLevel: profile.preferences.experienceLevel,
      coachTone: profile.preferences.coachTone,
      effortTracking: profile.preferences.effortTracking,
      language,
      timezone,
    },
    recentSessions,
    personalRecords: computePRs(history),
    weeklyMuscleVolume: muscleWeek.map((m) => ({ muscle: m.muscle, sets: m.sets })),
    nutritionGoal: nutritionGoal
      ? {
        calories: nutritionGoal.calories,
        proteinGrams: nutritionGoal.proteinGrams,
        carbsGrams: nutritionGoal.carbsGrams,
        fatGrams: nutritionGoal.fatGrams,
        updatedAt: nutritionGoal.updatedAt,
      }
      : null,
    streakDays: computeStreak(history),
    totalWorkouts: history.length,
  };
}
