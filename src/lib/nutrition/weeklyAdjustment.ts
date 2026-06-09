import type { BodyweightRecord } from '@/lib/db/schema';
import { kcalFromMacros } from './calculations';
import type {
  NutritionGoal as SavedNutritionGoal,
  NutritionGoalPatch,
  NutritionPhase,
} from '@/types/workout';

export const KG_PER_LB = 0.45359237;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MIN_DATA_SPAN_DAYS = 18;
const STALLED_WINDOW_PCT = 0.5;

export type WeeklyTrendStatus = 'insufficient_data' | 'stalled' | 'too_fast' | 'on_track';

export interface WeeklyAverage {
  weekStart: string;
  avgKg: number;
  count: number;
}

export interface WeeklyTrendAnalysis {
  status: WeeklyTrendStatus;
  weeksTracked: number;
  netChangePct: number;
  deltaKcal: number;
  suggestedCalories: number;
  weeklyAverages: WeeklyAverage[];
}

export interface WeeklyTrendArgs {
  phase: NutritionPhase;
  weights: BodyweightRecord[];
  currentCalories: number;
}

function toKg(entry: Pick<BodyweightRecord, 'weight' | 'unit'>): number {
  return entry.unit === 'lbs' ? entry.weight * KG_PER_LB : entry.weight;
}

function parseDateKey(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return formatDateKey(date);
}

function getDataSpanDays(weights: BodyweightRecord[]): number {
  if (weights.length === 0) return 0;
  const sorted = [...weights]
    .filter((entry) => entry.deletedAt === null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return 0;
  const first = parseDateKey(sorted[0].date).getTime();
  const last = parseDateKey(sorted[sorted.length - 1].date).getTime();
  return Math.floor((last - first) / MS_PER_DAY) + 1;
}

export function weeklyAverages(weights: BodyweightRecord[]): WeeklyAverage[] {
  const buckets = new Map<string, { totalKg: number; count: number }>();

  for (const entry of weights) {
    if (entry.deletedAt !== null) continue;
    const weekStart = getWeekStart(entry.date);
    const bucket = buckets.get(weekStart) ?? { totalKg: 0, count: 0 };
    bucket.totalKg += toKg(entry);
    bucket.count += 1;
    buckets.set(weekStart, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, bucket]) => ({
      weekStart,
      avgKg: bucket.count > 0 ? bucket.totalKg / bucket.count : 0,
      count: bucket.count,
    }));
}

export function analyzeWeeklyTrend({
  phase,
  weights,
  currentCalories,
}: WeeklyTrendArgs): WeeklyTrendAnalysis {
  const averages = weeklyAverages(weights);
  const weeksTracked = averages.length;
  const dataSpanDays = getDataSpanDays(weights);

  if (weeksTracked < 3 || dataSpanDays < MIN_DATA_SPAN_DAYS) {
    return {
      status: 'insufficient_data',
      weeksTracked,
      netChangePct: 0,
      deltaKcal: 0,
      suggestedCalories: currentCalories,
      weeklyAverages: averages,
    };
  }

  const window = averages.slice(-3);
  const first = window[0];
  const last = window[window.length - 1];
  const netChangePct = first.avgKg > 0 ? ((last.avgKg - first.avgKg) / first.avgKg) * 100 : 0;
  const spanWeeks = Math.max(
    1,
    (parseDateKey(last.weekStart).getTime() - parseDateKey(first.weekStart).getTime()) / MS_PER_WEEK,
  );
  const weeklyRatePct = netChangePct / spanWeeks;
  const isStalled = Math.abs(netChangePct) < STALLED_WINDOW_PCT;

  let status: WeeklyTrendStatus = 'on_track';
  let deltaKcal = 0;

  if (phase === 'definition') {
    if (weeklyRatePct < -1.0) {
      status = 'too_fast';
      deltaKcal = 125;
    } else if (isStalled) {
      status = 'stalled';
      deltaKcal = -150;
    }
  } else {
    const monthlyRatePct = weeklyRatePct * 4.345;
    if (monthlyRatePct > 1.5) {
      status = 'too_fast';
      deltaKcal = -100;
    } else if (isStalled) {
      status = 'stalled';
      deltaKcal = 150;
    }
  }

  return {
    status,
    weeksTracked,
    netChangePct,
    deltaKcal,
    suggestedCalories: Math.max(0, Math.round(currentCalories + deltaKcal)),
    weeklyAverages: averages,
  };
}

export function applyCalorieDelta(goal: SavedNutritionGoal, deltaKcal: number): NutritionGoalPatch {
  const proteinGrams = Math.max(0, Math.round(goal.proteinGrams));
  let carbsGrams = Math.max(0, Math.round(goal.carbsGrams));
  let fatGrams = Math.max(0, Math.round(goal.fatGrams));

  if (deltaKcal >= 0) {
    carbsGrams += Math.max(0, Math.round(deltaKcal / 4));
  } else {
    const carbDelta = Math.min(carbsGrams, Math.abs(Math.round(deltaKcal / 4)));
    carbsGrams -= carbDelta;

    const remainingKcal = deltaKcal + carbDelta * 4;
    if (remainingKcal < 0) {
      const fatDelta = Math.min(fatGrams, Math.abs(Math.round(remainingKcal / 9)));
      fatGrams -= fatDelta;
    }
  }

  return {
    calories: kcalFromMacros(proteinGrams, carbsGrams, fatGrams),
    proteinGrams,
    carbsGrams,
    fatGrams,
  };
}
