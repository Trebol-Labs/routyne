/**
 * Conflict resolution helpers — last-write-wins strategy.
 * Local IDB is always the authoritative source for rendering.
 * Remote data is merged in only when it is strictly newer.
 */

import { saveHistoryEntry } from '@/lib/db/history';
import { saveBodyweight, deleteBodyweightEntriesByDate } from '@/lib/db/bodyweight';
import { loadProfile, saveProfile, normalizeProfileRecord } from '@/lib/db/profile';
import type { BodyweightRecord } from '@/lib/db/schema';
import type { Database } from '@/lib/supabase/client';
import type {
  HistoryEntry,
  ExerciseVolume,
  UserProfile,
} from '@/types/workout';

type RemoteHistory = Database['public']['Tables']['history']['Row'];
type RemoteProfile = Database['public']['Tables']['profiles']['Row'];
type RemoteBodyweight = Database['public']['Tables']['bodyweight']['Row'];

// ── History ────────────────────────────────────────────────────────────────────

function remoteToLocalEntry(r: RemoteHistory): HistoryEntry {
  const volumeData = (r.volume_data as ExerciseVolume[] | null) ?? [];
  return {
    id: r.id,
    sessionIdx: r.session_idx ?? 0,
    sessionTitle: r.session_title,
    completedAt: new Date(r.completed_at),
    completedExercises: volumeData.map((ev) => ev.exerciseId),
    volumeData,
    totalVolume: r.total_volume ?? 0,
    durationSeconds: r.duration_secs ?? undefined,
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
  return {
    id: remote.id,
    date: remote.date,
    weight: remote.weight,
    unit: remote.unit as 'kg' | 'lbs',
    updatedAt: remote.updated_at,
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

  const remoteUpdatedAt = new Date(remote.updated_at).getTime();
  const localUpdatedAt = local ? new Date(local.updatedAt).getTime() : 0;
  if (!local || remoteUpdatedAt > localUpdatedAt) {
    await saveBodyweight(remoteToLocalBodyweight(remote));
    return true;
  }

  return false;
}

// ── History payload builder ────────────────────────────────────────────────────

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
    notes: null,
    deleted_at: null,
  };
}
