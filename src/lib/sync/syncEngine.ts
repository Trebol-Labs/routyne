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
  mergeRemoteRoutine,
  historyEntryToRemote,
  profileToRemote,
  bodyweightToRemote,
  routineToRemote,
} from './merge';
import { loadAllHistory } from '@/lib/db/history';
import { loadAllBodyweight, loadBodyweightByDate } from '@/lib/db/bodyweight';
import { loadProfile } from '@/lib/db/profile';
import { loadMetaValue, saveMetaValue } from '@/lib/db/meta';
import { loadAllRoutineRecords, loadRoutine, loadRoutineRecord } from '@/lib/db/routines';
import { generateMarkdown } from '@/lib/markdown/generator';
import type { SyncMutationRecord } from '@/lib/db/schema';
import type { BodyweightRecord } from '@/lib/db/schema';
import type { UserProfile } from '@/types/workout';

const INITIAL_SYNC_KEY_PREFIX = 'cloud-sync-initialized:';
const SYNC_BATCH_SIZE = 100;
const inFlightSyncs = new Map<string, Promise<void>>();

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getCursor(userId: string): Promise<string> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('sync_cursors')
    .select('last_pulled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(`[Sync] cursor lookup failed: ${error.message}`);
  }
  const row = data as { last_pulled: string } | null;
  return row?.last_pulled ?? '1970-01-01T00:00:00.000Z';
}

async function updateCursor(userId: string, ts: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from('sync_cursors')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ user_id: userId, last_pulled: ts } as any, { onConflict: 'user_id' });
  if (error) {
    throw new Error(`[Sync] cursor update failed: ${error.message}`);
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let idx = 0; idx < items.length; idx += size) {
    chunks.push(items.slice(idx, idx + size));
  }
  return chunks;
}

async function seedLocalSnapshotToCloud(userId: string): Promise<void> {
  const sb = getSupabaseClient();
  const [profile, history, bodyweight] = await Promise.all([
    loadProfile(),
    loadAllHistory(),
    loadAllBodyweight(),
  ]);
  const routineRecords = await loadAllRoutineRecords();

  await pushProfileToCloud(userId, profile);

  for (const batch of chunk(history, SYNC_BATCH_SIZE)) {
    const rows = batch.map((entry) => historyEntryToRemote(entry, userId));
    const { error } = await sb.from('history').upsert(rows as never);
    if (error) {
      throw new Error(`[Sync] history bootstrap failed: ${error.message}`);
    }
  }

  for (const batch of chunk(bodyweight, SYNC_BATCH_SIZE)) {
    const rows = batch.map((entry) => bodyweightToRemote(entry, userId));
    const { error } = await sb.from('bodyweight').upsert(rows as never, {
      onConflict: 'user_id,date',
    });
    if (error) {
      throw new Error(`[Sync] bodyweight bootstrap failed: ${error.message}`);
    }
  }

  for (const record of routineRecords) {
    const routine = await loadRoutine(record.id);
    if (!routine) continue;

    const sourceMarkdown = record.sourceMarkdown || generateMarkdown(routine);
    const { error } = await sb.from('routines').upsert(
      routineToRemote(record, sourceMarkdown, userId) as never,
      { onConflict: 'id' }
    );
    if (error) {
      throw new Error(`[Sync] routine bootstrap failed: ${error.message}`);
    }
  }
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
      const { error } = await sb.from('history').upsert({ ...payload, user_id: userId } as any);
      if (error) {
        throw new Error(`[Sync] history upsert failed: ${error.message}`);
      }
      return;
    }

    const id = (mutation.payload as { id: string }).id;
    const { error } = await sb
      .from('history')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) {
      throw new Error(`[Sync] history delete failed: ${error.message}`);
    }
    return;
  }

  if (mutation.table === 'profile') {
    await pushProfileToCloud(userId, await loadProfile());
    return;
  }

  if (mutation.table === 'routines') {
    const routineId = (mutation.payload as { id: string }).id;

    if (mutation.operation === 'delete') {
      const now = new Date().toISOString();
      const { error } = await sb
        .from('routines')
        .update({ deleted_at: now, updated_at: now } as never)
        .eq('id', routineId)
        .eq('user_id', userId);
      if (error) {
        throw new Error(`[Sync] routine delete failed: ${error.message}`);
      }
      return;
    }

    const [record, routine] = await Promise.all([
      loadRoutineRecord(routineId),
      loadRoutine(routineId),
    ]);
    if (!record || !routine) {
      return;
    }

    const sourceMarkdown = record.sourceMarkdown || generateMarkdown(routine);
    const { error } = await sb.from('routines').upsert(
      routineToRemote(record, sourceMarkdown, userId) as never,
      { onConflict: 'id' }
    );
    if (error) {
      throw new Error(`[Sync] routine upsert failed: ${error.message}`);
    }
    return;
  }

  if (mutation.table === 'bodyweight') {
    const payload = mutation.payload as BodyweightRecord;

    if (mutation.operation === 'upsert') {
      const currentEntry = await loadBodyweightByDate(payload.date);
      if (!currentEntry) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await sb.from('bodyweight').upsert(bodyweightToRemote(currentEntry, userId) as any, {
        onConflict: 'user_id,date',
      });
      if (error) {
        throw new Error(`[Sync] bodyweight upsert failed: ${error.message}`);
      }
      return;
    }

    // Bodyweight uses user_id + date as the logical conflict target.
    // Deletes are soft-deleted tombstones so other devices can honor them.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await sb.from('bodyweight').upsert(bodyweightToRemote(payload, userId) as any, {
      onConflict: 'user_id,date',
    });
    if (error) {
      throw new Error(`[Sync] bodyweight delete failed: ${error.message}`);
    }
    return;
  }
}

// ── Pull ───────────────────────────────────────────────────────────────────────

export async function pullFromCloud(userId: string): Promise<number> {
  const sb = getSupabaseClient();
  const cursor = await getCursor(userId);
  const pullStart = new Date().toISOString();

  const [historyResult, profileResult, bodyweightResult, routinesResult] = await Promise.all([
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
    sb
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor)
      .order('updated_at', { ascending: true }),
  ]);

  const historyError = historyResult.error;
  const profileError = profileResult.error;
  const bodyweightError = bodyweightResult.error;
  const routinesError = routinesResult.error;

  if (historyError) {
    throw new Error(`[Sync] history pull failed: ${historyError.message}`);
  }
  if (profileError) {
    throw new Error(`[Sync] profile pull failed: ${profileError.message}`);
  }
  if (bodyweightError) {
    throw new Error(`[Sync] bodyweight pull failed: ${bodyweightError.message}`);
  }
  if (routinesError) {
    throw new Error(`[Sync] routine pull failed: ${routinesError.message}`);
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

  const remoteRoutines = routinesResult.data ?? [];
  if (remoteRoutines.length > 0) {
    const localRoutineRecords = await loadAllRoutineRecords();
    const localById = new Map(localRoutineRecords.map((record) => [record.id, record]));

    for (const remote of remoteRoutines) {
      const changed = await mergeRemoteRoutine(remote, localById);
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
  const { error } = await sb.from('profiles').upsert(profileToRemote(profile, userId) as never, {
    onConflict: 'user_id',
  });
  if (error) {
    throw new Error(`[Sync] profile upsert failed: ${error.message}`);
  }
}

export async function syncCloudData(userId: string): Promise<void> {
  const existing = inFlightSyncs.get(userId);
  if (existing) {
    return existing;
  }

  const syncPromise = (async () => {
    const initialSyncKey = `${INITIAL_SYNC_KEY_PREFIX}${userId}`;
    const initialSyncAt = await loadMetaValue(initialSyncKey);

    if (!initialSyncAt) {
      await pullFromCloud(userId);
      await pushToCloud(userId);
      await seedLocalSnapshotToCloud(userId);

      const now = new Date().toISOString();
      await updateCursor(userId, now);
      await saveMetaValue(initialSyncKey, now);
      return;
    }

    await pushToCloud(userId);
    await pullFromCloud(userId);
  })().finally(() => {
    inFlightSyncs.delete(userId);
  });

  inFlightSyncs.set(userId, syncPromise);
  return syncPromise;
}

// ── Re-export for store integration ───────────────────────────────────────────
export { historyEntryToRemote, profileToRemote, bodyweightToRemote, routineToRemote };
