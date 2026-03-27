/**
 * Conflict resolution helpers — last-write-wins strategy.
 * Local IDB is always the authoritative source for rendering.
 * Remote data is merged in only when it is strictly newer.
 */

import { saveHistoryEntry } from '@/lib/db/history';
import type { Database } from '@/lib/supabase/client';
import type { HistoryEntry, ExerciseVolume } from '@/types/workout';

type RemoteHistory = Database['public']['Tables']['history']['Row'];

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
    // Not local — insert from remote
    const entry = remoteToLocalEntry(remote);
    await saveHistoryEntry(
      entry,
      entry.id, // routineId unknown remotely — use entry id as fallback
      entry.id
    );
    return true;
  }

  // Both exist — keep the newer completed_at
  const remoteDate = new Date(remote.completed_at);
  if (remoteDate > local.completedAt) {
    await saveHistoryEntry(
      remoteToLocalEntry(remote),
      remote.id,
      remote.id
    );
    return true;
  }

  return false; // local is at least as recent — no action
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
