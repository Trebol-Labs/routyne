/**
 * Sync engine — bidirectional push/pull between IDB and Supabase.
 *
 * Architecture:
 *  - IDB is always the local source of truth (renders from IDB only)
 *  - Push: drain syncQueue mutations → Supabase upsert
 *  - Pull: fetch remote records newer than last_pulled cursor → merge into IDB
 */

import { getSupabaseClient, type Database } from '@/lib/supabase/client';
import {
  getPendingMutations,
  dequeue,
  incrementRetry,
  pruneFailedMutations,
} from './queue';
import { mergeRemoteHistory, historyEntryToRemote } from './merge';
import { loadAllHistory } from '@/lib/db/history';
import type { SyncMutationRecord } from '@/lib/db/schema';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getCursor(userId: string): Promise<string> {
  const sb = getSupabaseClient();
  const { data } = await sb
    .from('sync_cursors')
    .select('last_pulled')
    .eq('user_id', userId)
    .single();
  // Supabase v2 generic overload resolves to `never` for this table shape;
  // the data is correctly typed at runtime — cast for TS satisfaction only.
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
  if (mutation.operation === 'upsert') {
    const payload = mutation.payload as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sb.from(mutation.table as 'history').upsert({ ...payload, user_id: userId } as any);
  } else {
    const id = (mutation.payload as { id: string }).id;
    await sb
      .from(mutation.table as 'history')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id);
  }
}

// ── Pull ───────────────────────────────────────────────────────────────────────

export async function pullFromCloud(userId: string): Promise<number> {
  const sb = getSupabaseClient();
  const cursor = await getCursor(userId);
  const pullStart = new Date().toISOString();

  const { data: remoteHistory, error } = await sb
    .from('history')
    .select('*')
    .eq('user_id', userId)
    .gt('synced_at', cursor)
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('[Sync] pull failed', error.message);
    return 0;
  }

  if (!remoteHistory || remoteHistory.length === 0) {
    await updateCursor(userId, pullStart);
    return 0;
  }

  // Build local map for O(1) lookup during merge
  const localHistory = await loadAllHistory();
  const localById = new Map(localHistory.map((e) => [e.id, e]));

  let merged = 0;
  for (const remote of remoteHistory) {
    const changed = await mergeRemoteHistory(remote, localById);
    if (changed) merged++;
  }

  await updateCursor(userId, pullStart);
  return merged;
}

// ── Profile push ───────────────────────────────────────────────────────────────

export async function pushProfileToCloud(
  userId: string,
  profile: {
    displayName: string;
    avatarEmoji: string;
    weightUnit: string;
    heightCm: number | null;
    defaultRestSeconds: number;
    restDays: number[];
  }
): Promise<void> {
  const sb = getSupabaseClient();
  await sb.from('profiles').upsert(
    {
      user_id: userId,
      display_name: profile.displayName,
      avatar_emoji: profile.avatarEmoji,
      weight_unit: profile.weightUnit,
      height_cm: profile.heightCm,
      default_rest_s: profile.defaultRestSeconds,
      rest_days: profile.restDays,
      updated_at: new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    { onConflict: 'user_id' }
  );
}

// ── Re-export for store integration ───────────────────────────────────────────
export { historyEntryToRemote };
