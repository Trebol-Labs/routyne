/**
 * Maps exercise clean names (lowercase) to primary muscle groups.
 * Used for weekly volume breakdown and recovery indicator.
 */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'forearms';

const MUSCLE_MAP: Record<string, MuscleGroup[]> = {
  // ── Chest ──────────────────────────────────────────────────────────────────
  'bench press': ['chest', 'triceps', 'shoulders'],
  'flat bench press': ['chest', 'triceps', 'shoulders'],
  'incline bench press': ['chest', 'triceps', 'shoulders'],
  'decline bench press': ['chest', 'triceps'],
  'dumbbell press': ['chest', 'triceps', 'shoulders'],
  'dumbbell bench press': ['chest', 'triceps', 'shoulders'],
  'incline dumbbell press': ['chest', 'triceps', 'shoulders'],
  'push up': ['chest', 'triceps', 'shoulders'],
  'push-up': ['chest', 'triceps', 'shoulders'],
  'pushup': ['chest', 'triceps', 'shoulders'],
  'chest fly': ['chest'],
  'cable fly': ['chest'],
  'pec deck': ['chest'],
  'dips': ['chest', 'triceps'],
  'chest dips': ['chest', 'triceps'],

  // ── Back ───────────────────────────────────────────────────────────────────
  'pull up': ['back', 'biceps'],
  'pull-up': ['back', 'biceps'],
  'pullup': ['back', 'biceps'],
  'chin up': ['back', 'biceps'],
  'chin-up': ['back', 'biceps'],
  'barbell row': ['back', 'biceps'],
  'bent over row': ['back', 'biceps'],
  'dumbbell row': ['back', 'biceps'],
  'one arm dumbbell row': ['back', 'biceps'],
  'seated cable row': ['back', 'biceps'],
  'lat pulldown': ['back', 'biceps'],
  'deadlift': ['back', 'glutes', 'hamstrings'],
  'romanian deadlift': ['hamstrings', 'glutes', 'back'],
  'rdl': ['hamstrings', 'glutes', 'back'],
  'straight leg deadlift': ['hamstrings', 'glutes', 'back'],
  'good morning': ['hamstrings', 'glutes', 'back'],
  'hyperextension': ['back', 'glutes'],
  'back extension': ['back', 'glutes'],
  't-bar row': ['back', 'biceps'],
  'face pull': ['shoulders', 'back'],

  // ── Shoulders ──────────────────────────────────────────────────────────────
  'overhead press': ['shoulders', 'triceps'],
  'ohp': ['shoulders', 'triceps'],
  'military press': ['shoulders', 'triceps'],
  'shoulder press': ['shoulders', 'triceps'],
  'dumbbell shoulder press': ['shoulders', 'triceps'],
  'arnold press': ['shoulders', 'triceps'],
  'lateral raise': ['shoulders'],
  'side lateral raise': ['shoulders'],
  'front raise': ['shoulders'],
  'rear delt fly': ['shoulders', 'back'],
  'upright row': ['shoulders', 'biceps'],
  'shrugs': ['shoulders'],
  'barbell shrug': ['shoulders'],

  // ── Biceps ─────────────────────────────────────────────────────────────────
  'barbell curl': ['biceps'],
  'dumbbell curl': ['biceps'],
  'bicep curl': ['biceps'],
  'biceps curl': ['biceps'],
  'hammer curl': ['biceps', 'forearms'],
  'preacher curl': ['biceps'],
  'concentration curl': ['biceps'],
  'cable curl': ['biceps'],
  'incline dumbbell curl': ['biceps'],
  'zottman curl': ['biceps', 'forearms'],

  // ── Triceps ────────────────────────────────────────────────────────────────
  'tricep dips': ['triceps'],
  'tricep pushdown': ['triceps'],
  'triceps pushdown': ['triceps'],
  'skull crusher': ['triceps'],
  'close grip bench press': ['triceps', 'chest'],
  'overhead tricep extension': ['triceps'],
  'tricep extension': ['triceps'],
  'cable tricep extension': ['triceps'],

  // ── Core ───────────────────────────────────────────────────────────────────
  'plank': ['core'],
  'crunch': ['core'],
  'sit up': ['core'],
  'sit-up': ['core'],
  'situp': ['core'],
  'leg raise': ['core'],
  'hanging leg raise': ['core'],
  'ab wheel': ['core'],
  'cable crunch': ['core'],
  'russian twist': ['core'],
  'bicycle crunch': ['core'],
  'mountain climber': ['core'],

  // ── Legs: Quads ────────────────────────────────────────────────────────────
  'squat': ['quads', 'glutes', 'hamstrings'],
  'back squat': ['quads', 'glutes', 'hamstrings'],
  'front squat': ['quads', 'glutes'],
  'goblet squat': ['quads', 'glutes'],
  'hack squat': ['quads', 'glutes'],
  'leg press': ['quads', 'glutes'],
  'leg extension': ['quads'],
  'lunge': ['quads', 'glutes'],
  'reverse lunge': ['quads', 'glutes'],
  'walking lunge': ['quads', 'glutes'],
  'split squat': ['quads', 'glutes'],
  'bulgarian split squat': ['quads', 'glutes'],
  'step up': ['quads', 'glutes'],

  // ── Legs: Hamstrings / Glutes ──────────────────────────────────────────────
  'leg curl': ['hamstrings'],
  'lying leg curl': ['hamstrings'],
  'seated leg curl': ['hamstrings'],
  'hip thrust': ['glutes', 'hamstrings'],
  'barbell hip thrust': ['glutes', 'hamstrings'],
  'glute bridge': ['glutes'],
  'cable kickback': ['glutes'],
  'donkey kick': ['glutes'],

  // ── Calves ─────────────────────────────────────────────────────────────────
  'calf raise': ['calves'],
  'standing calf raise': ['calves'],
  'seated calf raise': ['calves'],
  'donkey calf raise': ['calves'],
};

/** Fuzzy-ish match: normalize and scan MUSCLE_MAP keys as substrings. */
export function getMusclesForExercise(cleanName: string): MuscleGroup[] {
  const lower = cleanName.toLowerCase().trim();
  // Exact match first
  if (MUSCLE_MAP[lower]) return MUSCLE_MAP[lower];
  // Substring match (e.g. "Barbell Bench Press" matches "bench press")
  for (const [key, muscles] of Object.entries(MUSCLE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return muscles;
  }
  return [];
}

export interface MuscleGroupVolume {
  muscle: MuscleGroup;
  sets: number;
  lastTrainedAt: Date | null;
}

/**
 * Aggregates weekly muscle group set counts from history entries within
 * the last `days` days.
 */
export function getMuscleGroupVolume(
  history: Array<{ completedAt: Date; volumeData: Array<{ cleanName: string; setsCompleted: number }> }>,
  days = 7,
): MuscleGroupVolume[] {
  const cutoff = Date.now() - days * 86_400_000;
  const setCounts = new Map<MuscleGroup, number>();
  const lastTrained = new Map<MuscleGroup, Date>();

  for (const entry of history) {
    const completedAt = entry.completedAt instanceof Date
      ? entry.completedAt
      : new Date(entry.completedAt);
    if (completedAt.getTime() < cutoff) continue;

    for (const ev of entry.volumeData) {
      const muscles = getMusclesForExercise(ev.cleanName);
      for (const m of muscles) {
        setCounts.set(m, (setCounts.get(m) ?? 0) + ev.setsCompleted);
        const prev = lastTrained.get(m);
        if (!prev || completedAt > prev) lastTrained.set(m, completedAt);
      }
    }
  }

  return Array.from(setCounts.entries())
    .map(([muscle, sets]) => ({ muscle, sets, lastTrainedAt: lastTrained.get(muscle) ?? null }))
    .sort((a, b) => b.sets - a.sets);
}
