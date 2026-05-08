/**
 * Builds the user context object sent to the AI Coach API route.
 * Pulls from IDB-backed history and profile — no network calls.
 */

import { estimate1RM } from '@/lib/progression/engine';
import { getMuscleGroupVolume } from '@/lib/analytics/muscle-map';
import type { HistoryEntry, UserProfile, ExerciseVolume, NutritionGoal } from '@/types/workout';
import type { NutritionProfile } from '@/types/nutrition';
import type { PendingAdjustment } from '@/lib/db/nutritionAdjustment';
import type { BodyweightRecord } from '@/lib/db/schema';

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

export interface CoachNutritionProfile {
  goal: 'bulk' | 'cut' | 'recomp';
  experience: 'beginner' | 'intermediate' | 'advanced';
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: 'male' | 'female';
  activityLevel: string;
  bodyFatPct: number | null;
  trainingDaysPerWeek: number | null;
  trainingType: string | null;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  proteinPerKg: number;
  dietaryRestrictions: string[];
}

export interface CoachPendingAdjustment {
  reason: 'too_fast' | 'too_slow' | 'on_track' | 'insufficient_data';
  weeklyWeightChangePct: number;
  previousTargetKcal: number;
  suggestedTargetKcal: number;
  deltaKcal: number;
  computedAt: string;
}

export interface CoachBodyweightTrend {
  latestKg: number | null;
  latestDate: string | null;
  weeklyChangePct: number | null;     // % change between last-5 avg vs prior-5 avg
  pointsLast30Days: number;
}

export interface CoachStallSignal {
  exerciseName: string;
  sessionsTracked: number;            // last N sessions where this exercise appears
  flatOrRegressing: boolean;          // est1RM hasn't improved in last N sessions
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
  nutritionProfile: CoachNutritionProfile | null;
  pendingAdjustment: CoachPendingAdjustment | null;
  bodyweightTrend: CoachBodyweightTrend;
  stallSignals: CoachStallSignal[];
  weeklyTrainingDays: number;
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

const KG_PER_LB = 0.45359237;

function bodyweightToKg(b: BodyweightRecord): number {
  return b.unit === 'lbs' ? b.weight * KG_PER_LB : b.weight;
}

function computeBodyweightTrend(records: BodyweightRecord[]): CoachBodyweightTrend {
  const live = records
    .filter((r) => r.deletedAt === null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (live.length === 0) {
    return { latestKg: null, latestDate: null, weeklyChangePct: null, pointsLast30Days: 0 };
  }

  const latest = live[live.length - 1];
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30 = live.filter((r) => new Date(r.date).getTime() >= cutoff);

  let weeklyChangePct: number | null = null;
  if (live.length >= 10) {
    const recent = live.slice(-5);
    const prev = live.slice(-10, -5);
    const avg = (xs: BodyweightRecord[]) => xs.reduce((s, w) => s + bodyweightToKg(w), 0) / xs.length;
    const ar = avg(recent);
    const ap = avg(prev);
    if (ap > 0) weeklyChangePct = ((ar - ap) / ap) * 100;
  }

  return {
    latestKg: Math.round(bodyweightToKg(latest) * 10) / 10,
    latestDate: latest.date,
    weeklyChangePct: weeklyChangePct === null ? null : Math.round(weeklyChangePct * 100) / 100,
    pointsLast30Days: last30.length,
  };
}

/**
 * Detects whether the top movements have stalled in the last 4 sessions
 * (estimated 1RM hasn't improved). This is what powers the priority-hierarchy
 * diagnosis when the user says "I'm not progressing".
 */
function computeStallSignals(history: HistoryEntry[]): CoachStallSignal[] {
  const recent = history.slice(0, 8); // newest first
  if (recent.length < 3) return [];

  const byExercise = new Map<string, { est1RM: number | null }[]>();
  for (const entry of recent) {
    for (const vol of entry.volumeData) {
      const key = vol.cleanName.trim().toLowerCase();
      if (!byExercise.has(key)) byExercise.set(key, []);
      byExercise.get(key)!.push({ est1RM: getBestEstimated1RM(vol) });
    }
  }

  const signals: CoachStallSignal[] = [];
  for (const [name, points] of byExercise) {
    const tracked = points.filter((p) => p.est1RM !== null);
    if (tracked.length < 3) continue;
    // Newest-first → take the 4 most recent; check if best is also the oldest
    const window = tracked.slice(0, 4);
    const newest = window[0].est1RM!;
    const max = Math.max(...window.map((p) => p.est1RM!));
    const flat = newest <= max * 1.005; // <=0.5% above the window max → essentially flat
    const oldestEqualsNewest = newest <= window[window.length - 1].est1RM! * 1.005;
    signals.push({
      exerciseName: name,
      sessionsTracked: window.length,
      flatOrRegressing: flat && oldestEqualsNewest,
    });
  }

  return signals.filter((s) => s.flatOrRegressing).slice(0, 5);
}

function computeWeeklyTrainingDays(history: HistoryEntry[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const days = new Set<string>();
  for (const e of history) {
    if (new Date(e.completedAt).getTime() >= cutoff) {
      days.add(new Date(e.completedAt).toDateString());
    }
  }
  return days.size;
}

function mapNutritionProfile(p: NutritionProfile): CoachNutritionProfile {
  const proteinPerKg = p.weightKg > 0 ? Math.round((p.proteinG / p.weightKg) * 100) / 100 : 0;
  return {
    goal: p.goal,
    experience: p.experience,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    ageYears: p.ageYears,
    sex: p.sex,
    activityLevel: p.activityLevel,
    bodyFatPct: p.bodyFatPct,
    trainingDaysPerWeek: p.trainingDaysPerWeek,
    trainingType: p.trainingType,
    bmrKcal: p.bmrKcal,
    tdeeKcal: p.tdeeKcal,
    targetKcal: p.targetKcal,
    proteinG: p.proteinG,
    carbsG: p.carbsG,
    fatsG: p.fatsG,
    proteinPerKg,
    dietaryRestrictions: p.dietaryRestrictions,
  };
}

export interface BuildUserContextArgs {
  history: HistoryEntry[];
  profile: UserProfile;
  nutritionGoal?: NutritionGoal;
  nutritionProfile?: NutritionProfile | null;
  pendingAdjustment?: PendingAdjustment | null;
  bodyweight?: BodyweightRecord[];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildUserContext(args: BuildUserContextArgs): UserCoachContext;
export function buildUserContext(
  history: HistoryEntry[],
  profile: UserProfile,
  nutritionGoal?: NutritionGoal,
): UserCoachContext;
export function buildUserContext(
  arg1: HistoryEntry[] | BuildUserContextArgs,
  arg2?: UserProfile,
  arg3?: NutritionGoal,
): UserCoachContext {
  const args: BuildUserContextArgs = Array.isArray(arg1)
    ? { history: arg1, profile: arg2 as UserProfile, nutritionGoal: arg3 }
    : arg1;

  const { history, profile, nutritionGoal, nutritionProfile, pendingAdjustment, bodyweight } = args;

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
    newPRNames: [],
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
    nutritionProfile: nutritionProfile ? mapNutritionProfile(nutritionProfile) : null,
    pendingAdjustment: pendingAdjustment
      ? {
        reason: pendingAdjustment.reason,
        weeklyWeightChangePct: Math.round(pendingAdjustment.weeklyWeightChangePct * 100) / 100,
        previousTargetKcal: pendingAdjustment.previousTargetKcal,
        suggestedTargetKcal: pendingAdjustment.suggestedTargetKcal,
        deltaKcal: pendingAdjustment.deltaKcal,
        computedAt: pendingAdjustment.computedAt,
      }
      : null,
    bodyweightTrend: computeBodyweightTrend(bodyweight ?? []),
    stallSignals: computeStallSignals(history),
    weeklyTrainingDays: computeWeeklyTrainingDays(history),
    streakDays: computeStreak(history),
    totalWorkouts: history.length,
  };
}
