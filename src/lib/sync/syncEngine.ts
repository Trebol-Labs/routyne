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
  mergeRemoteNutritionProfile,
  mergeRemoteHevyArchive,
  historyEntryToRemote,
  profileToRemote,
  bodyweightToRemote,
  routineToRemote,
  nutritionProfileToRemote,
  hevyArchiveToRemote,
} from './merge';
import { loadAllHistory } from '@/lib/db/history';
import { loadAllBodyweight, loadBodyweightByDate } from '@/lib/db/bodyweight';
import { loadProfile } from '@/lib/db/profile';
import { loadNutritionProfile } from '@/lib/db/nutritionProfile';
import { loadHevyArchiveSnapshot } from '@/lib/db/hevyArchive';
import { loadMetaValue, saveMetaValue } from '@/lib/db/meta';
import { loadAllRoutineRecords, loadRoutine, loadRoutineRecord } from '@/lib/db/routines';
import { generateMarkdown } from '@/lib/markdown/generator';
import { startTrace, logEvent, finishTrace, type SyncTrace } from './debug';
import type { Database } from '@/lib/supabase/client';
import type { SyncMutationRecord } from '@/lib/db/schema';
import type { BodyweightRecord } from '@/lib/db/schema';
import type { UserProfile } from '@/types/workout';

const INITIAL_SYNC_KEY_PREFIX = 'cloud-sync-initialized:';
const SYNC_BATCH_SIZE = 100;
const inFlightSyncs = new Map<string, Promise<void>>();
type SyncError = { message: string; code?: string; details?: string; hint?: string };
type RemoteBodyweightRow = Database['public']['Tables']['bodyweight']['Row'];
type QueryResponse<T> = { data: T[] | null; error: SyncError | null };

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

function getEntityKey(mutation: SyncMutationRecord): string {
  if (mutation.table === 'profile' || mutation.table === 'nutritionProfile') {
    return mutation.table;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = mutation.payload as any;
  if (mutation.table === 'bodyweight') {
    return `bodyweight:${payload.date}`;
  }
  return `${mutation.table}:${payload.id}`;
}

function isBodyweightMetadataSchemaError(error: SyncError | null | undefined): boolean {
  if (!error) return false;

  const text = [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ').toLowerCase();

  const mentionsMetadataColumn =
    text.includes('updated_at') || text.includes('deleted_at') || text.includes('created_at');
  const looksLikeMissingColumn =
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('column') ||
    text.includes('42703') ||
    text.includes('pgrst204');

  return mentionsMetadataColumn && looksLikeMissingColumn;
}

function isConflictTargetError(error: SyncError | null | undefined): boolean {
  if (!error) return false;

  const text = [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ').toLowerCase();

  return text.includes('42p10') || text.includes('no unique or exclusion constraint');
}

function isProfileSchemaError(error: SyncError | null | undefined): boolean {
  if (!error) return false;

  const text = [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ').toLowerCase();

  const mentionsProfileColumn =
    text.includes('display_name') ||
    text.includes('avatar_emoji') ||
    text.includes('weight_unit') ||
    text.includes('height_cm') ||
    text.includes('default_rest_s') ||
    text.includes('rest_days') ||
    text.includes('preferences') ||
    text.includes('updated_at') ||
    text.includes('user_id');

  const looksLikeSchemaError =
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('column') ||
    text.includes('42703') ||
    text.includes('pgrst204');

  return mentionsProfileColumn && looksLikeSchemaError;
}

function dedupeBodyweightByDate(entries: BodyweightRecord[]): BodyweightRecord[] {
  const byDate = new Map<string, BodyweightRecord>();
  for (const entry of entries) {
    const existing = byDate.get(entry.date);
    if (!existing) {
      byDate.set(entry.date, entry);
      continue;
    }
    const existingTs = Date.parse(existing.updatedAt) || 0;
    const candidateTs = Date.parse(entry.updatedAt) || 0;
    if (candidateTs >= existingTs) {
      byDate.set(entry.date, entry);
    }
  }
  return Array.from(byDate.values());
}

function bodyweightToRemoteCompat(entry: BodyweightRecord, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    weight: entry.weight,
    unit: entry.unit,
  };
}

function profileToRemoteCompat(profile: UserProfile, userId: string) {
  return {
    user_id: userId,
    display_name: profile.displayName || null,
    avatar_emoji: profile.avatarEmoji,
    weight_unit: profile.weightUnit,
  };
}

async function upsertBodyweightToCloud(
  sb: ReturnType<typeof getSupabaseClient>,
  entry: BodyweightRecord,
  userId: string
): Promise<SyncError | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await sb.from('bodyweight').upsert(bodyweightToRemote(entry, userId) as any, {
    onConflict: 'user_id,date',
  });
  if (!isBodyweightMetadataSchemaError(result.error)) {
    return result.error;
  }

  console.warn('[Sync] bodyweight metadata columns are missing in Supabase; retrying legacy upsert');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fallback = await sb.from('bodyweight').upsert(bodyweightToRemoteCompat(entry, userId) as any, {
    onConflict: 'user_id,date',
  });
  return fallback.error;
}

async function deleteBodyweightFromCloud(
  sb: ReturnType<typeof getSupabaseClient>,
  entry: BodyweightRecord,
  userId: string
): Promise<SyncError | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await sb.from('bodyweight').upsert(bodyweightToRemote(entry, userId) as any, {
    onConflict: 'user_id,date',
  });
  if (!isBodyweightMetadataSchemaError(result.error)) {
    return result.error;
  }

  console.warn('[Sync] bodyweight tombstone columns are missing in Supabase; retrying legacy hard delete');
  const fallback = await sb
    .from('bodyweight')
    .delete()
    .eq('user_id', userId)
    .eq('date', entry.date);
  return fallback.error;
}

async function pullBodyweightRows(
  sb: ReturnType<typeof getSupabaseClient>,
  userId: string,
  cursor: string
): Promise<QueryResponse<RemoteBodyweightRow>> {
  const result = await sb
    .from('bodyweight')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', cursor)
    .order('updated_at', { ascending: true });

  if (!isBodyweightMetadataSchemaError(result.error)) {
    return result as QueryResponse<RemoteBodyweightRow>;
  }

  console.warn('[Sync] bodyweight updated_at is missing in Supabase; falling back to full date pull');
  const fallback = await sb
    .from('bodyweight')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  return fallback as QueryResponse<RemoteBodyweightRow>;
}

async function seedLocalSnapshotToCloud(userId: string): Promise<void> {
  const sb = getSupabaseClient();
  const [profile, history, bodyweight, hevyArchive] = await Promise.all([
    loadProfile(),
    loadAllHistory(),
    loadAllBodyweight(),
    loadHevyArchiveSnapshot(),
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

  const dedupedBodyweight = dedupeBodyweightByDate(bodyweight);

  for (const batch of chunk(dedupedBodyweight, SYNC_BATCH_SIZE)) {
    const rows = batch.map((entry) => bodyweightToRemote(entry, userId));
    let { error } = await sb.from('bodyweight').upsert(rows as never, {
      onConflict: 'user_id,date',
    });
    if (isBodyweightMetadataSchemaError(error)) {
      console.warn('[Sync] bodyweight metadata columns are missing in Supabase; retrying legacy bootstrap');
      const fallbackRows = batch.map((entry) => bodyweightToRemoteCompat(entry, userId));
      const fallback = await sb.from('bodyweight').upsert(fallbackRows as never, {
        onConflict: 'user_id,date',
      });
      error = fallback.error;
    }
    if (error) {
      throw new Error(`[Sync] bodyweight bootstrap failed: ${error.message}`);
    }
  }

  const routinesWithRecords = await Promise.all(
    routineRecords.map(async (record) => {
      const routine = await loadRoutine(record.id);
      return { record, routine };
    })
  );

  const routineRows = [];
  for (const { record, routine } of routinesWithRecords) {
    if (!routine) continue;

    const sourceMarkdown = record.sourceMarkdown || generateMarkdown(routine);
    routineRows.push(routineToRemote(record, sourceMarkdown, userId));
  }

  for (const batch of chunk(routineRows, SYNC_BATCH_SIZE)) {
    const { error } = await sb.from('routines').upsert(batch as never, {
      onConflict: 'id',
    });
    if (error) {
      throw new Error(`[Sync] routine bootstrap failed: ${error.message}`);
    }
  }

  const nutritionProfile = await loadNutritionProfile();
  if (nutritionProfile) {
    const { error } = await sb.from('nutrition_profiles').upsert(
      nutritionProfileToRemote(nutritionProfile, userId) as never,
      { onConflict: 'user_id' }
    );
    if (error && !isMissingNutritionTableError(error)) {
      throw new Error(`[Sync] nutrition profile bootstrap failed: ${error.message}`);
    }
  }

  if (hevyArchive) {
    const { error } = await sb.from('hevy_archives').upsert(
      hevyArchiveToRemote(hevyArchive, userId) as never,
      { onConflict: 'user_id' }
    );
    if (error && !isMissingHevyTableError(error)) {
      throw new Error(`[Sync] Hevy archive bootstrap failed: ${error.message}`);
    }
  }
}

function isMissingNutritionTableError(error: SyncError | null | undefined): boolean {
  if (!error) return false;
  const text = [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    text.includes('nutrition_profiles') &&
    (text.includes('does not exist') ||
      text.includes('schema cache') ||
      text.includes('42p01') ||
      text.includes('pgrst205'))
  );
}

function isMissingHevyTableError(error: SyncError | null | undefined): boolean {
  if (!error) return false;
  const text = [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    text.includes('hevy_archives') &&
    (text.includes('does not exist') ||
      text.includes('schema cache') ||
      text.includes('42p01') ||
      text.includes('pgrst205'))
  );
}

// ── Push ───────────────────────────────────────────────────────────────────────

export async function pushToCloud(
  userId: string,
  options: { trace?: SyncTrace } = {}
): Promise<void> {
  await pruneFailedMutations(5);

  const pending = await getPendingMutations();
  if (options.trace) {
    logEvent(options.trace, 'push:start', { pending: pending.length });
  }
  if (pending.length === 0) return;

  const sb = getSupabaseClient();
  let pushed = 0;
  let failed = 0;

  const groups = new Map<string, SyncMutationRecord[]>();
  for (const m of pending) {
    const key = getEntityKey(m);
    const group = groups.get(key) ?? [];
    group.push(m);
    groups.set(key, group);
  }

  const chains = Array.from(groups.values());
  for (const batch of chunk(chains, 10)) {
    await Promise.all(
      batch.map(async (chain) => {
        for (const mutation of chain) {
          try {
            await applyMutation(sb, mutation, userId);
            await dequeue(mutation.id);
            pushed++;
          } catch (err) {
            if (options.trace) {
              logEvent(options.trace, 'push:mutation-failed', {
                id: mutation.id,
                table: mutation.table,
                op: mutation.operation,
              }, err);
            }
            console.error('[Sync] push failed for mutation', mutation.id, err);
            await incrementRetry(mutation.id);
            failed++;
          }
        }
      })
    );
  }

  if (options.trace) {
    logEvent(options.trace, 'push:done', { pushed, failed });
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

  if (mutation.table === 'nutritionProfile') {
    const current = await loadNutritionProfile();
    if (!current) return;
    const { error } = await sb.from('nutrition_profiles').upsert(
      nutritionProfileToRemote(current, userId) as never,
      { onConflict: 'user_id' }
    );
    if (error) {
      if (isMissingNutritionTableError(error)) {
        console.warn('[Sync] nutrition_profiles table missing in Supabase; skipping push');
        return;
      }
      throw new Error(`[Sync] nutrition profile upsert failed: ${error.message}`);
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

      const error = await upsertBodyweightToCloud(sb, currentEntry, userId);
      if (error) {
        throw new Error(`[Sync] bodyweight upsert failed: ${error.message}`);
      }
      return;
    }

    const error = await deleteBodyweightFromCloud(sb, payload, userId);
    if (error) {
      throw new Error(`[Sync] bodyweight delete failed: ${error.message}`);
    }
    return;
  }
}

// ── Pull ───────────────────────────────────────────────────────────────────────

const EPOCH_CURSOR = '1970-01-01T00:00:00.000Z';

export async function pullFromCloud(
  userId: string,
  options: { fullPull?: boolean; trace?: SyncTrace } = {}
): Promise<number> {
  const sb = getSupabaseClient();
  const cursor = options.fullPull ? EPOCH_CURSOR : await getCursor(userId);
  const pullStart = new Date().toISOString();
  const trace = options.trace;
  if (trace) {
    logEvent(trace, 'pull:start', { cursor, fullPull: !!options.fullPull });
  }

  const [historyResult, profileResult, bodyweightResult, routinesResult, nutritionProfileResult, hevyArchiveResult] = await Promise.all([
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
    pullBodyweightRows(sb, userId, cursor),
    sb
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor)
      .order('updated_at', { ascending: true }),
    sb
      .from('nutrition_profiles')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor),
    sb
      .from('hevy_archives')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor),
  ]);

  const historyError = historyResult.error;
  const profileError = profileResult.error;
  const bodyweightError = bodyweightResult.error;
  const routinesError = routinesResult.error;
  const nutritionProfileError = nutritionProfileResult.error;
  const hevyArchiveError = hevyArchiveResult.error;

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
  if (nutritionProfileError && !isMissingNutritionTableError(nutritionProfileError)) {
    throw new Error(`[Sync] nutrition profile pull failed: ${nutritionProfileError.message}`);
  }
  if (hevyArchiveError && !isMissingHevyTableError(hevyArchiveError)) {
    throw new Error(`[Sync] Hevy archive pull failed: ${hevyArchiveError.message}`);
  }

  const remoteHistory = historyResult.data ?? [];
  const remoteProfiles = profileResult.data ?? [];
  const remoteBodyweight = bodyweightResult.data ?? [];
  const remoteRoutines = routinesResult.data ?? [];
  const remoteNutritionProfiles = nutritionProfileResult.data ?? [];
  const remoteHevyArchives = hevyArchiveResult.data ?? [];

  if (trace) {
    logEvent(trace, 'pull:fetched', {
      history: remoteHistory.length,
      profiles: remoteProfiles.length,
      bodyweight: remoteBodyweight.length,
      routines: remoteRoutines.length,
      nutritionProfiles: remoteNutritionProfiles.length,
      hevyArchives: remoteHevyArchives.length,
    });
  }

  let merged = 0;
  let historyMerged = 0;
  let profileMerged = 0;
  let bodyweightMerged = 0;
  let routinesMerged = 0;
  let nutritionProfileMerged = 0;
  let hevyArchiveMerged = 0;

  if (remoteHistory.length > 0) {
    const localHistory = await loadAllHistory();
    const localById = new Map(localHistory.map((e) => [e.id, e]));

    for (const remote of remoteHistory) {
      const changed = await mergeRemoteHistory(remote, localById);
      if (changed) {
        merged++;
        historyMerged++;
      }
    }
  }

  for (const remote of remoteProfiles) {
    const changed = await mergeRemoteProfile(remote);
    if (changed) {
      merged++;
      profileMerged++;
    }
  }

  if (remoteBodyweight.length > 0) {
    const localBodyweight = await loadAllBodyweight();
    const localByDate = new Map(localBodyweight.map((entry) => [entry.date, entry]));

    for (const remote of remoteBodyweight) {
      const changed = await mergeRemoteBodyweight(remote, localByDate);
      if (changed) {
        merged++;
        bodyweightMerged++;
      }
    }
  }

  if (remoteRoutines.length > 0) {
    const localRoutineRecords = await loadAllRoutineRecords();
    const localById = new Map(localRoutineRecords.map((record) => [record.id, record]));

    for (const remote of remoteRoutines) {
      const changed = await mergeRemoteRoutine(remote, localById);
      if (changed) {
        merged++;
        routinesMerged++;
      }
    }
  }

  for (const remote of remoteNutritionProfiles) {
    const changed = await mergeRemoteNutritionProfile(remote);
    if (changed) {
      merged++;
      nutritionProfileMerged++;
    }
  }

  for (const remote of remoteHevyArchives) {
    const changed = await mergeRemoteHevyArchive(remote);
    if (changed) {
      merged++;
      hevyArchiveMerged++;
    }
  }

  await updateCursor(userId, pullStart);

  if (trace) {
    logEvent(trace, 'pull:merged', {
      historyMerged,
      profileMerged,
      bodyweightMerged,
      routinesMerged,
      nutritionProfileMerged,
      hevyArchiveMerged,
      cursorAdvancedTo: pullStart,
    });
  }

  return merged;
}

// ── Profile push ───────────────────────────────────────────────────────────────

export async function pushProfileToCloud(
  userId: string,
  profile: UserProfile
): Promise<void> {
  const sb = getSupabaseClient();
  const payload = profileToRemote(profile, userId);
  const { error } = await sb.from('profiles').upsert(payload as never, {
    onConflict: 'user_id',
  });
  if (!error) {
    return;
  }

  if (isConflictTargetError(error)) {
    console.warn('[Sync] profiles.user_id is missing a unique constraint; retrying profile upsert without onConflict');
    const fallback = await sb.from('profiles').upsert(payload as never);
    if (!fallback.error) {
      return;
    }

    throw new Error(`[Sync] profile upsert failed: ${fallback.error.message}`);
  }

  if (isProfileSchemaError(error)) {
    console.warn('[Sync] profiles schema is missing newer columns; retrying legacy profile upsert');
    const fallbackPayload = profileToRemoteCompat(profile, userId);
    const fallback = await sb.from('profiles').upsert(fallbackPayload as never, {
      onConflict: 'user_id',
    });
    if (!fallback.error) {
      return;
    }

    if (isConflictTargetError(fallback.error)) {
      const conflictFallback = await sb.from('profiles').upsert(fallbackPayload as never);
      if (!conflictFallback.error) {
        return;
      }
      throw new Error(`[Sync] profile upsert failed: ${conflictFallback.error.message}`);
    }

    throw new Error(`[Sync] profile upsert failed: ${fallback.error.message}`);
  }

  throw new Error(`[Sync] profile upsert failed: ${error.message}`);
}

export async function syncCloudData(userId: string): Promise<void> {
  const existing = inFlightSyncs.get(userId);
  if (existing) {
    return existing;
  }

  const trace = startTrace(userId);

  const syncPromise = (async () => {
    try {
      const sb = getSupabaseClient();
      // Best-effort; some test mocks don't expose .auth.
      const getUser = sb.auth?.getUser?.bind(sb.auth);
      if (getUser) {
        const { data: authData } = await getUser();
        logEvent(trace, 'auth:check', {
          requestedUserId: userId,
          authUserId: authData.user?.id ?? null,
          authEmail: authData.user?.email ?? null,
          hasSession: !!authData.user,
        });
        if (!authData.user || authData.user.id !== userId) {
          logEvent(trace, 'auth:mismatch', {}, new Error('auth user does not match requested userId'));
        }
      }
    } catch (err) {
      logEvent(trace, 'auth:check-failed', {}, err);
    }

    const initialSyncKey = `${INITIAL_SYNC_KEY_PREFIX}${userId}`;
    const initialSyncAt = await loadMetaValue(initialSyncKey);
    logEvent(trace, 'bootstrap:check', { hasInitialSyncKey: !!initialSyncAt, initialSyncAt });

    if (!initialSyncAt) {
      // First sync on this device. The remote sync_cursors row may already
      // be advanced from another device, so we ignore it and pull every
      // row owned by this user — otherwise a fresh install with the same
      // account would render an empty IDB.
      logEvent(trace, 'bootstrap:start', { path: 'first-device-pull-then-seed' });
      await pullFromCloud(userId, { fullPull: true, trace });
      await pushToCloud(userId, { trace });
      await seedLocalSnapshotToCloud(userId);
      logEvent(trace, 'bootstrap:seeded', {});

      const now = new Date().toISOString();
      await updateCursor(userId, now);
      await saveMetaValue(initialSyncKey, now);
      logEvent(trace, 'bootstrap:done', { cursor: now });
      return;
    }

    logEvent(trace, 'incremental:start', {});
    await pushToCloud(userId, { trace });
    await pullFromCloud(userId, { trace });
    logEvent(trace, 'incremental:done', {});
  })()
    .then(() => finishTrace(trace, true))
    .catch((err) => {
      logEvent(trace, 'sync:fatal', {}, err);
      finishTrace(trace, false);
      throw err;
    })
    .finally(() => {
      inFlightSyncs.delete(userId);
    });

  inFlightSyncs.set(userId, syncPromise);
  return syncPromise;
}

// ── Re-export for store integration ───────────────────────────────────────────
export { historyEntryToRemote, profileToRemote, bodyweightToRemote, routineToRemote };
