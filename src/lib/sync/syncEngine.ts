/**
 * Sync engine — bidirectional push/pull between IDB and Supabase.
 *
 * Architecture:
 *  - IDB is always the local source of truth (renders from IDB only)
 *  - Push: drain syncQueue mutations → Supabase upsert
 *  - Pull: fetch remote records newer than last_pulled cursor → merge into IDB
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import {
  getPendingMutations,
  dequeue,
  incrementRetry,
  pruneFailedMutations,
} from './queue';
import {
  mergeRemoteHistory,
  mergeRemoteProfile,
  mergeRemoteBodyweight,
  historyEntryToRemote,
  profileToRemote,
  bodyweightToRemote,
} from './merge';
import { loadAllHistory } from '@/lib/db/history';
import { loadAllBodyweight } from '@/lib/db/bodyweight';
import type { SyncMutationRecord } from '@/lib/db/schema';
import type { BodyweightRecord } from '@/lib/db/schema';
import type { UserProfile } from '@/types/workout';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getCursor(userId: string): Promise<string> {
  const sb = getSupabaseClient();
  const { data } = await sb
    .from('sync_cursors')
    .select('last_pulled')
    .eq('user_id', userId)
    .single();
  const row = data as { last_pulled: string } | null;
  return row?.last_pulled ?? '1970-01-01T00:00:00.000Z';
}

async function updateCursor(userId: string, ts: string): Promise<void> {
  const sb = getSupabaseClient();
  await sb
    .from('sync_cursors')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ user_id: userId, last_pulled: ts } as any, { onConflict: 'user_id' });
}

// ── Push ───────────────────────────────────────────────────────────────────────

export async function pushToCloud(userId: string): Promise<void> {
  await pruneFailedMutations(5);

  const pending = await getPendingMutations();
  if (pending.length === 0) return;

  const sb = getSupabaseClient();

  for (const mutation of pending) {
    try {
      await applyMutation(sb, mutation, userId);
      await dequeue(mutation.id);
    } catch (err) {
      console.error('[Sync] push failed for mutation', mutation.id, err);
      await incrementRetry(mutation.id);
    }
  }
}

async function applyMutation(
  sb: ReturnType<typeof getSupabaseClient>,
  mutation: SyncMutationRecord,
  userId: string
): Promise<void> {
  if (mutation.table === 'history') {
    if (mutation.operation === 'upsert') {
      const payload = mutation.payload as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sb.from('history').upsert({ ...payload, user_id: userId } as any);
      return;
    }

    const id = (mutation.payload as { id: string }).id;
    await sb
      .from('history')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id);
    return;
  }

  if (mutation.table === 'profile') {
    await pushProfileToCloud(userId, mutation.payload as UserProfile);
    return;
  }

  if (mutation.table === 'bodyweight') {
    const payload = mutation.payload as BodyweightRecord;
    // Bodyweight uses user_id + date as the logical conflict target.
    // Deletes are soft-deleted tombstones so other devices can honor them.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sb.from('bodyweight').upsert(bodyweightToRemote(payload, userId) as any, {
      onConflict: 'user_id,date',
    });
    return;
  }
}

// ── Pull ───────────────────────────────────────────────────────────────────────

export async function pullFromCloud(userId: string): Promise<number> {
  const sb = getSupabaseClient();
  const cursor = await getCursor(userId);
  const pullStart = new Date().toISOString();

  const [historyResult, profileResult, bodyweightResult] = await Promise.all([
    sb
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .gt('synced_at', cursor)
      .order('completed_at', { ascending: false }),
    sb
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor),
    sb
      .from('bodyweight')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor)
      .order('updated_at', { ascending: true }),
  ]);

  const historyError = historyResult.error;
  const profileError = profileResult.error;
  const bodyweightError = bodyweightResult.error;

  if (historyError) {
    console.error('[Sync] history pull failed', historyError.message);
    return 0;
  }
  if (profileError) {
    console.error('[Sync] profile pull failed', profileError.message);
  }
  if (bodyweightError) {
    console.error('[Sync] bodyweight pull failed', bodyweightError.message);
  }

  let merged = 0;

  const remoteHistory = historyResult.data ?? [];
  if (remoteHistory.length > 0) {
    const localHistory = await loadAllHistory();
    const localById = new Map(localHistory.map((e) => [e.id, e]));

    for (const remote of remoteHistory) {
      const changed = await mergeRemoteHistory(remote, localById);
      if (changed) merged++;
    }
  }

  const remoteProfiles = profileResult.data ?? [];
  for (const remote of remoteProfiles) {
    const changed = await mergeRemoteProfile(remote);
    if (changed) merged++;
  }

  const remoteBodyweight = bodyweightResult.data ?? [];
  if (remoteBodyweight.length > 0) {
    const localBodyweight = await loadAllBodyweight();
    const localByDate = new Map(localBodyweight.map((entry) => [entry.date, entry]));

    for (const remote of remoteBodyweight) {
      const changed = await mergeRemoteBodyweight(remote, localByDate);
      if (changed) merged++;
    }
  }

  await updateCursor(userId, pullStart);
  return merged;
}

// ── Profile push ───────────────────────────────────────────────────────────────

export async function pushProfileToCloud(
  userId: string,
  profile: UserProfile
): Promise<void> {
  const sb = getSupabaseClient();
  await sb.from('profiles').upsert(profileToRemote(profile, userId) as never, {
    onConflict: 'user_id',
  });
}

// ── Re-export for store integration ───────────────────────────────────────────
export { historyEntryToRemote, profileToRemote, bodyweightToRemote };
