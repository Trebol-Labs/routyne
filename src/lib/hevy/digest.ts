import { estimate1RM } from '@/lib/progression/engine';
import type { HevyWorkout, HevySet } from './types';

// ── Public types ─────────────────────────────────────────────────────────────

export interface HevyExerciseStats {
  name: string;
  workouts: number;            // workouts this exercise appears in
  totalSets: number;           // working sets only
  totalReps: number;
  totalVolumeKg: number;
  bestWeightKg: number | null;
  bestReps: number | null;     // reps achieved at best weight
  bestEst1RMKg: number | null; // epley
  bestEst1RMDate: string | null;
  firstSeen: string;
  lastSeen: string;
  avgRpe: number | null;
}

export interface HevyProgressionPoint {
  /** YYYY-MM month bucket. */
  month: string;
  /** Best est1RM in this month (working sets only). */
  est1RMKg: number;
  workouts: number;
}

export interface HevyExerciseProgression {
  name: string;
  points: HevyProgressionPoint[];   // chronological
  weeksSincePR: number;             // weeks since the all-time best est1RM
}

export interface HevyRecentWorkout {
  date: string;                     // YYYY-MM-DD
  title: string;
  durationMinutes: number;
  description: string | null;
  exercises: Array<{
    name: string;
    sets: Array<{
      type: string;
      weightKg: number | null;
      reps: number | null;
      rpe: number | null;
    }>;
    notes: string | null;
  }>;
}

export interface HevyComments {
  /** Most recent non-empty workout descriptions (latest first). */
  workoutNotes: Array<{ date: string; text: string }>;
  /** Frequent exercise-level notes grouped by exercise. */
  exerciseNotes: Array<{ exercise: string; text: string; date: string }>;
}

export interface HevyAthleteDigest {
  importedAt: string;
  totalWorkouts: number;
  firstWorkoutAt: string | null;
  lastWorkoutAt: string | null;
  spanDays: number;
  avgWorkoutsPerWeek: number;
  totalSets: number;
  totalVolumeKg: number;
  avgDurationMinutes: number;
  setTypeMix: { warmup: number; working: number; dropset: number; failure: number };
  rpeUsageRatio: number;            // 0–1 fraction of working sets with rpe
  /** Top 20 exercises by workout frequency. */
  topExercises: HevyExerciseStats[];
  /** Progression trend (monthly best est1RM) for the top 12 exercises. */
  progression: HevyExerciseProgression[];
  /** Stagnant lifts: top exercises with 8+ weeks since their best est1RM. */
  stagnation: Array<{ name: string; weeksSincePR: number; bestEst1RMKg: number }>;
  comments: HevyComments;
  /** Last 5 workouts in compressed form. */
  recentWorkouts: HevyRecentWorkout[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const WORKING_TYPES = new Set(['normal', 'failure', 'dropset']);

function isWorkingSet(s: HevySet): boolean {
  return WORKING_TYPES.has(s.type) && (s.reps ?? 0) > 0;
}

function monthBucket(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function dateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Per-exercise aggregation ─────────────────────────────────────────────────

interface ExerciseAccumulator {
  name: string;
  workouts: Set<string>;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  bestEst1RMKg: number;
  bestEst1RMDate: string | null;
  bestWeightKg: number | null;
  bestReps: number | null;
  rpeSum: number;
  rpeCount: number;
  firstSeen: string;
  lastSeen: string;
  /** month → { est1RM max, workouts set } */
  monthly: Map<string, { est1RM: number; workouts: Set<string> }>;
}

function ensureAcc(map: Map<string, ExerciseAccumulator>, name: string, date: string): ExerciseAccumulator {
  let acc = map.get(name);
  if (!acc) {
    acc = {
      name,
      workouts: new Set(),
      totalSets: 0,
      totalReps: 0,
      totalVolumeKg: 0,
      bestEst1RMKg: 0,
      bestEst1RMDate: null,
      bestWeightKg: null,
      bestReps: null,
      rpeSum: 0,
      rpeCount: 0,
      firstSeen: date,
      lastSeen: date,
      monthly: new Map(),
    };
    map.set(name, acc);
  } else {
    if (date < acc.firstSeen) acc.firstSeen = date;
    if (date > acc.lastSeen) acc.lastSeen = date;
  }
  return acc;
}

function accToStats(acc: ExerciseAccumulator): HevyExerciseStats {
  return {
    name: acc.name,
    workouts: acc.workouts.size,
    totalSets: acc.totalSets,
    totalReps: acc.totalReps,
    totalVolumeKg: round1(acc.totalVolumeKg),
    bestWeightKg: acc.bestWeightKg,
    bestReps: acc.bestReps,
    bestEst1RMKg: acc.bestEst1RMKg > 0 ? round1(acc.bestEst1RMKg) : null,
    bestEst1RMDate: acc.bestEst1RMDate,
    firstSeen: acc.firstSeen,
    lastSeen: acc.lastSeen,
    avgRpe: acc.rpeCount > 0 ? round1(acc.rpeSum / acc.rpeCount) : null,
  };
}

function accToProgression(acc: ExerciseAccumulator, now: number): HevyExerciseProgression {
  const points = Array.from(acc.monthly.entries())
    .map(([month, m]) => ({ month, est1RMKg: round1(m.est1RM), workouts: m.workouts.size }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const weeksSincePR = acc.bestEst1RMDate
    ? Math.max(0, Math.round((now - new Date(acc.bestEst1RMDate).getTime()) / (7 * 24 * 60 * 60 * 1000)))
    : 0;
  return { name: acc.name, points, weeksSincePR };
}

// ── Comments collection ──────────────────────────────────────────────────────

function collectComments(workouts: HevyWorkout[]): HevyComments {
  const sorted = [...workouts].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  const workoutNotes: Array<{ date: string; text: string }> = [];
  const exerciseNotes: Array<{ exercise: string; text: string; date: string }> = [];

  for (const w of sorted) {
    if (w.description && w.description.trim()) {
      workoutNotes.push({ date: dateOnly(w.start_time), text: w.description.trim() });
    }
    for (const ex of w.exercises) {
      if (ex.notes && ex.notes.trim()) {
        exerciseNotes.push({
          exercise: ex.title.trim(),
          text: ex.notes.trim(),
          date: dateOnly(w.start_time),
        });
      }
    }
  }

  return {
    workoutNotes: workoutNotes.slice(0, 30),
    exerciseNotes: exerciseNotes.slice(0, 60),
  };
}

// ── Recent workouts ──────────────────────────────────────────────────────────

function buildRecentWorkouts(workouts: HevyWorkout[]): HevyRecentWorkout[] {
  return [...workouts]
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 5)
    .map((w) => {
      const start = new Date(w.start_time).getTime();
      const end = new Date(w.end_time).getTime();
      const duration = Number.isFinite(start) && Number.isFinite(end) && end > start
        ? Math.round((end - start) / 60000)
        : 0;
      return {
        date: dateOnly(w.start_time),
        title: w.title || 'Workout',
        durationMinutes: duration,
        description: w.description?.trim() || null,
        exercises: w.exercises.map((ex) => ({
          name: ex.title.trim(),
          notes: ex.notes?.trim() || null,
          sets: ex.sets.map((s) => ({
            type: s.type,
            weightKg: s.weight_kg,
            reps: s.reps,
            rpe: s.rpe,
          })),
        })),
      };
    });
}

// ── Main entry ───────────────────────────────────────────────────────────────

export function computeHevyDigest(
  workouts: HevyWorkout[],
  now: Date = new Date()
): HevyAthleteDigest {
  const importedAt = now.toISOString();

  if (workouts.length === 0) {
    return {
      importedAt,
      totalWorkouts: 0,
      firstWorkoutAt: null,
      lastWorkoutAt: null,
      spanDays: 0,
      avgWorkoutsPerWeek: 0,
      totalSets: 0,
      totalVolumeKg: 0,
      avgDurationMinutes: 0,
      setTypeMix: { warmup: 0, working: 0, dropset: 0, failure: 0 },
      rpeUsageRatio: 0,
      topExercises: [],
      progression: [],
      stagnation: [],
      comments: { workoutNotes: [], exerciseNotes: [] },
      recentWorkouts: [],
    };
  }

  const sortedAsc = [...workouts].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const firstWorkoutAt = sortedAsc[0].start_time;
  const lastWorkoutAt = sortedAsc[sortedAsc.length - 1].start_time;
  const spanMs = new Date(lastWorkoutAt).getTime() - new Date(firstWorkoutAt).getTime();
  const spanDays = Math.max(1, Math.round(spanMs / (24 * 60 * 60 * 1000)));
  const avgWorkoutsPerWeek = round1((workouts.length / spanDays) * 7);

  let totalSets = 0;
  let totalVolumeKg = 0;
  let totalDurationMin = 0;
  const setTypeMix = { warmup: 0, working: 0, dropset: 0, failure: 0 };
  let workingSetsWithRpe = 0;
  let workingSetsTotal = 0;

  const exerciseMap = new Map<string, ExerciseAccumulator>();

  for (const w of sortedAsc) {
    const date = dateOnly(w.start_time);
    const month = monthBucket(w.start_time);

    const start = new Date(w.start_time).getTime();
    const end = new Date(w.end_time).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      totalDurationMin += (end - start) / 60000;
    }

    for (const ex of w.exercises) {
      const name = ex.title.trim();
      if (!name) continue;
      const acc = ensureAcc(exerciseMap, name, date);
      acc.workouts.add(w.id);

      let monthBucketEntry = acc.monthly.get(month);
      if (!monthBucketEntry) {
        monthBucketEntry = { est1RM: 0, workouts: new Set() };
        acc.monthly.set(month, monthBucketEntry);
      }
      monthBucketEntry.workouts.add(w.id);

      for (const s of ex.sets) {
        if (s.type === 'warmup') setTypeMix.warmup += 1;
        else if (s.type === 'dropset') setTypeMix.dropset += 1;
        else if (s.type === 'failure') setTypeMix.failure += 1;
        else if (s.type === 'normal') setTypeMix.working += 1;

        if (!isWorkingSet(s)) continue;

        totalSets += 1;
        workingSetsTotal += 1;
        acc.totalSets += 1;
        const reps = s.reps ?? 0;
        const weight = s.weight_kg ?? 0;
        acc.totalReps += reps;
        const vol = weight * reps;
        acc.totalVolumeKg += vol;
        totalVolumeKg += vol;

        if (s.rpe !== null && s.rpe !== undefined) {
          acc.rpeSum += s.rpe;
          acc.rpeCount += 1;
          workingSetsWithRpe += 1;
        }

        if (weight > 0 && reps > 0) {
          const e1rm = estimate1RM(weight, reps);
          if (e1rm > acc.bestEst1RMKg) {
            acc.bestEst1RMKg = e1rm;
            acc.bestEst1RMDate = date;
            acc.bestWeightKg = weight;
            acc.bestReps = reps;
          }
          if (e1rm > monthBucketEntry.est1RM) {
            monthBucketEntry.est1RM = e1rm;
          }
        }
      }
    }
  }

  const allExercises = Array.from(exerciseMap.values());
  const byFrequency = [...allExercises].sort((a, b) => b.workouts.size - a.workouts.size);

  const topExercises = byFrequency.slice(0, 20).map(accToStats);
  const progression = byFrequency.slice(0, 12).map((acc) => accToProgression(acc, now.getTime()));

  const stagnation = byFrequency
    .slice(0, 20)
    .map((acc) => ({
      name: acc.name,
      weeksSincePR: acc.bestEst1RMDate
        ? Math.round((now.getTime() - new Date(acc.bestEst1RMDate).getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 0,
      bestEst1RMKg: acc.bestEst1RMKg > 0 ? round1(acc.bestEst1RMKg) : 0,
    }))
    .filter((s) => s.weeksSincePR >= 8 && s.bestEst1RMKg > 0)
    .sort((a, b) => b.weeksSincePR - a.weeksSincePR)
    .slice(0, 10);

  return {
    importedAt,
    totalWorkouts: workouts.length,
    firstWorkoutAt,
    lastWorkoutAt,
    spanDays,
    avgWorkoutsPerWeek,
    totalSets,
    totalVolumeKg: round1(totalVolumeKg),
    avgDurationMinutes: round1(totalDurationMin / workouts.length),
    setTypeMix,
    rpeUsageRatio: workingSetsTotal > 0 ? round1(workingSetsWithRpe / workingSetsTotal) : 0,
    topExercises,
    progression,
    stagnation,
    comments: collectComments(workouts),
    recentWorkouts: buildRecentWorkouts(workouts),
  };
}
