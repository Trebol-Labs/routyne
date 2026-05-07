/**
 * Conflict resolution helpers — last-write-wins strategy.
 * Local IDB is always the authoritative source for rendering.
 * Remote data is merged in only when it is strictly newer.
 */

import { saveHistoryEntry } from '@/lib/db/history';
import { saveBodyweight, deleteBodyweightEntriesByDate } from '@/lib/db/bodyweight';
import { loadProfile, saveProfile, normalizeProfileRecord } from '@/lib/db/profile';
import { deleteRoutine, saveRoutineFromRemote } from '@/lib/db/routines';
import {
  loadNutritionProfile,
  persistNutritionProfileSilently,
} from '@/lib/db/nutritionProfile';
import { parseRoutine } from '@/lib/markdown/parser';
import type { BodyweightRecord } from '@/lib/db/schema';
import type { RoutineRecord } from '@/lib/db/schema';
import type { Database } from '@/lib/supabase/client';
import type {
  HistoryEntry,
  ExerciseVolume,
  UserProfile,
} from '@/types/workout';
import type {
  NutritionProfile,
  ActivityLevel,
  TrainingType,
  TrainingTime,
  Budget,
  DietaryRestriction,
} from '@/types/nutrition';

type RemoteHistory = Database['public']['Tables']['history']['Row'];
type RemoteProfile = Database['public']['Tables']['profiles']['Row'];
type RemoteBodyweight = Database['public']['Tables']['bodyweight']['Row'];
type RemoteRoutine = Database['public']['Tables']['routines']['Row'];
type RemoteNutritionProfile = Database['public']['Tables']['nutrition_profiles']['Row'];

// ── History ────────────────────────────────────────────────────────────────────

function remoteToLocalEntry(r: RemoteHistory): HistoryEntry {
  const volumeData = ((r.volume_data as ExerciseVolume[] | null) ?? []).map((ev) => ({
    ...ev,
    setDetails: (ev.setDetails ?? []).map((sd) => ({
      setIdx: sd.setIdx,
      repsDone: sd.repsDone,
      weight: sd.weight,
      timestamp: sd.timestamp ? new Date(sd.timestamp as unknown as string) : null,
      rpe: sd.rpe,
      rir: sd.rir,
      setType: sd.setType,
      notes: sd.notes,
    })),
  }));
  return {
    id: r.id,
    sessionIdx: r.session_idx ?? 0,
    sessionTitle: r.session_title,
    completedAt: new Date(r.completed_at),
    completedExercises: volumeData.map((ev) => ev.exerciseId),
    volumeData,
    totalVolume: r.total_volume ?? 0,
    durationSeconds: r.duration_secs ?? undefined,
    notes: r.notes ?? undefined,
  };
}

/**
 * Merge a remote history record into local IDB.
 * Only writes if the local record is missing OR remote is strictly newer.
 */
export async function mergeRemoteHistory(
  remote: RemoteHistory,
  localById: Map<string, HistoryEntry>
): Promise<boolean> {
  const local = localById.get(remote.id);

  if (!local) {
    const entry = remoteToLocalEntry(remote);
    await saveHistoryEntry(entry, entry.id, entry.id);
    return true;
  }

  const remoteDate = new Date(remote.completed_at);
  if (remoteDate > local.completedAt) {
    await saveHistoryEntry(remoteToLocalEntry(remote), remote.id, remote.id);
    return true;
  }

  return false;
}

// ── Profile ────────────────────────────────────────────────────────────────────

function remoteToLocalProfile(remote: RemoteProfile): UserProfile {
  return normalizeProfileRecord({
    id: 'profile',
    displayName: remote.display_name ?? 'Atleta',
    avatarEmoji: remote.avatar_emoji ?? '💪',
    weightUnit: (remote.weight_unit as 'kg' | 'lbs') ?? 'kg',
    heightCm: remote.height_cm ?? null,
    defaultRestSeconds: remote.default_rest_s ?? 90,
    restDays: remote.rest_days ?? [],
    preferences: remote.preferences ?? {},
    updatedAt: remote.updated_at ?? new Date(0).toISOString(),
  });
}

export function profileToRemote(
  profile: UserProfile,
  userId: string
): Database['public']['Tables']['profiles']['Insert'] {
  return {
    user_id: userId,
    display_name: profile.displayName || null,
    avatar_emoji: profile.avatarEmoji,
    weight_unit: profile.weightUnit,
    height_cm: profile.heightCm,
    default_rest_s: profile.defaultRestSeconds,
    rest_days: profile.restDays,
    preferences: profile.preferences as unknown as Record<string, unknown>,
    updated_at: profile.updatedAt,
  };
}

export async function mergeRemoteProfile(remote: RemoteProfile): Promise<boolean> {
  const local = await loadProfile();
  const localUpdated = new Date(local.updatedAt).getTime();
  const remoteUpdated = new Date(remote.updated_at).getTime();

  if (remoteUpdated <= localUpdated) {
    return false;
  }

  await saveProfile(remoteToLocalProfile(remote));
  return true;
}

// ── Bodyweight ────────────────────────────────────────────────────────────────

function remoteToLocalBodyweight(remote: RemoteBodyweight): BodyweightRecord {
  const updatedAt = remote.updated_at ?? remote.created_at ?? new Date(0).toISOString();
  return {
    id: remote.id,
    date: remote.date,
    weight: remote.weight,
    unit: remote.unit as 'kg' | 'lbs',
    updatedAt,
    deletedAt: remote.deleted_at,
  };
}

export function bodyweightToRemote(
  entry: BodyweightRecord,
  userId: string
): Database['public']['Tables']['bodyweight']['Insert'] {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    weight: entry.weight,
    unit: entry.unit,
    updated_at: entry.updatedAt,
    deleted_at: entry.deletedAt,
  };
}

export async function mergeRemoteBodyweight(
  remote: RemoteBodyweight,
  localByDate: Map<string, BodyweightRecord>
): Promise<boolean> {
  const local = localByDate.get(remote.date);

  if (remote.deleted_at) {
    const remoteDeletedAt = new Date(remote.deleted_at).getTime();
    const localUpdatedAt = local ? new Date(local.updatedAt).getTime() : 0;
    if (!local || remoteDeletedAt > localUpdatedAt) {
      await deleteBodyweightEntriesByDate(remote.date);
      return !!local;
    }
    return false;
  }

  const remoteUpdatedAt = new Date(remote.updated_at ?? remote.created_at ?? 0).getTime();
  const localUpdatedAt = local ? new Date(local.updatedAt).getTime() : 0;
  if (!local || remoteUpdatedAt > localUpdatedAt) {
    await saveBodyweight(remoteToLocalBodyweight(remote));
    return true;
  }

  return false;
}

// ── Routines ──────────────────────────────────────────────────────────────────

export function routineToRemote(
  record: RoutineRecord,
  sourceMarkdown: string,
  userId: string
): Database['public']['Tables']['routines']['Insert'] {
  return {
    id: record.id,
    user_id: userId,
    title: record.title,
    source_md: sourceMarkdown,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    deleted_at: null,
  };
}

function remoteToLocalRoutine(remote: RemoteRoutine) {
  if (!remote.source_md?.trim()) {
    return null;
  }

  try {
    const parsed = parseRoutine(remote.source_md);
    return {
      ...parsed,
      id: remote.id,
      title: remote.title,
      createdAt: new Date(remote.created_at),
    };
  } catch (error) {
    console.error('[Sync] routine parse failed', remote.id, error);
    return null;
  }
}

export async function mergeRemoteRoutine(
  remote: RemoteRoutine,
  localById: Map<string, RoutineRecord>
): Promise<boolean> {
  const local = localById.get(remote.id);
  const remoteUpdatedAt = new Date(remote.updated_at).getTime();

  if (remote.deleted_at) {
    const remoteDeletedAt = new Date(remote.deleted_at).getTime();
    const localUpdatedAt = local ? new Date(local.updatedAt).getTime() : 0;
    if (local && remoteDeletedAt > localUpdatedAt) {
      await deleteRoutine(remote.id);
      return true;
    }
    return false;
  }

  if (local) {
    const localUpdatedAt = new Date(local.updatedAt).getTime();
    if (remoteUpdatedAt <= localUpdatedAt) {
      return false;
    }
  }

  const routine = remoteToLocalRoutine(remote);
  if (!routine) {
    return false;
  }

  await saveRoutineFromRemote(routine, remote.source_md ?? '', {
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
  });
  return true;
}

// ── History payload builder ────────────────────────────────────────────────────

// ── Nutrition Profile ────────────────────────────────────────────────────────

const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'very_active',
  'extra_active',
] as const;

const TRAINING_TYPES: readonly TrainingType[] = [
  'strength',
  'hypertrophy',
  'cardio',
  'mixed',
] as const;

const TRAINING_TIMES: readonly TrainingTime[] = ['morning', 'afternoon', 'evening'] as const;

const BUDGETS: readonly Budget[] = ['low', 'medium', 'high'] as const;

const DIETARY_RESTRICTIONS: readonly DietaryRestriction[] = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'gluten_free',
  'lactose_free',
  'nut_free',
  'halal',
  'kosher',
  'low_fodmap',
] as const;

function isMember<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function nutritionProfileToRemote(
  local: NutritionProfile,
  userId: string
): Database['public']['Tables']['nutrition_profiles']['Insert'] {
  return {
    user_id: userId,
    weight_kg: local.weightKg,
    height_cm: local.heightCm,
    age_years: local.ageYears,
    sex: local.sex,
    activity_level: local.activityLevel,
    goal: local.goal,
    experience: local.experience,
    body_fat_pct: local.bodyFatPct,
    training_days: local.trainingDaysPerWeek,
    training_type: local.trainingType,
    training_time: local.trainingTime,
    dietary_restrictions: local.dietaryRestrictions,
    custom_restrictions: local.customRestrictions,
    budget: local.budget,
    bmr_kcal: local.bmrKcal,
    tdee_kcal: local.tdeeKcal,
    target_kcal: local.targetKcal,
    protein_g: local.proteinG,
    fats_g: local.fatsG,
    carbs_g: local.carbsG,
    created_at: local.createdAt,
    updated_at: local.updatedAt,
  };
}

function remoteToLocalNutritionProfile(remote: RemoteNutritionProfile): NutritionProfile {
  return {
    weightKg: remote.weight_kg,
    heightCm: remote.height_cm,
    ageYears: remote.age_years,
    sex: remote.sex,
    activityLevel: isMember(remote.activity_level, ACTIVITY_LEVELS) ? remote.activity_level : 'moderate',
    goal: remote.goal,
    experience:
      remote.experience === 'beginner' || remote.experience === 'intermediate' || remote.experience === 'advanced'
        ? remote.experience
        : 'intermediate',
    bodyFatPct: remote.body_fat_pct,
    trainingDaysPerWeek: remote.training_days,
    trainingType: isMember(remote.training_type, TRAINING_TYPES) ? remote.training_type : null,
    trainingTime: isMember(remote.training_time, TRAINING_TIMES) ? remote.training_time : null,
    dietaryRestrictions: (remote.dietary_restrictions ?? []).filter((r): r is DietaryRestriction =>
      isMember(r, DIETARY_RESTRICTIONS),
    ),
    customRestrictions: remote.custom_restrictions ?? [],
    budget: isMember(remote.budget, BUDGETS) ? remote.budget : null,
    bmrKcal: remote.bmr_kcal,
    tdeeKcal: remote.tdee_kcal,
    targetKcal: remote.target_kcal,
    proteinG: remote.protein_g,
    fatsG: remote.fats_g,
    carbsG: remote.carbs_g,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
  };
}

export async function mergeRemoteNutritionProfile(
  remote: RemoteNutritionProfile
): Promise<boolean> {
  const local = await loadNutritionProfile();
  const remoteUpdated = new Date(remote.updated_at).getTime();
  const localUpdated = local ? new Date(local.updatedAt).getTime() : 0;
  if (local && remoteUpdated <= localUpdated) return false;
  await persistNutritionProfileSilently(remoteToLocalNutritionProfile(remote));
  return true;
}

export function historyEntryToRemote(
  entry: HistoryEntry,
  userId: string
): Database['public']['Tables']['history']['Insert'] {
  return {
    id: entry.id,
    user_id: userId,
    session_idx: entry.sessionIdx,
    session_title: entry.sessionTitle,
    completed_at:
      entry.completedAt instanceof Date
        ? entry.completedAt.toISOString()
        : String(entry.completedAt),
    total_volume: entry.totalVolume,
    duration_secs: entry.durationSeconds ?? null,
    volume_data: entry.volumeData,
    notes: entry.notes ?? null,
    deleted_at: null,
  };
}
