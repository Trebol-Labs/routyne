/**
 * Sync engine tests — Supabase client is mocked via vi.mock.
 * IDB operations use fake-indexeddb (patched in src/test/setup.ts).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDBSingleton } from '@/lib/db/index';

// ── Mock Supabase ────────────────────────────────────────────────────────────

const mockUpsert = vi.fn().mockResolvedValue({ error: null });

type QueryTable =
  | 'history'
  | 'profiles'
  | 'bodyweight'
  | 'routines'
  | 'sync_cursors'
  | 'nutrition_profiles'
  | 'hevy_archives';
type QueryResult = { data: unknown; error: { message: string } | null };
type QueryResultState = QueryResult | QueryResult[];

const queryResults: Record<QueryTable, QueryResultState> = {
  history: { data: [], error: null },
  profiles: { data: [], error: null },
  bodyweight: { data: [], error: null },
  routines: { data: [], error: null },
  sync_cursors: { data: null, error: null },
  nutrition_profiles: { data: [], error: null },
  hevy_archives: { data: [], error: null },
};

function setQueryResult(table: QueryTable, result: QueryResultState): void {
  queryResults[table] = result;
}

function getQueryResult(table: QueryTable): QueryResult {
  const result = queryResults[table];
  if (!Array.isArray(result)) {
    return result;
  }

  const next = result.shift();
  if (!next) {
    return { data: [], error: null };
  }
  return next;
}

function createBuilder(table: QueryTable) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(async () => getQueryResult('sync_cursors')),
    maybeSingle: vi.fn(async () => getQueryResult('sync_cursors')),
    upsert: mockUpsert,
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    then: (
      onFulfilled?: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(getQueryResult(table)).then(onFulfilled, onRejected),
  };
  return builder;
}

const mockFrom = vi.fn((table: string) => createBuilder(table as QueryTable));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { enqueue, dequeue, getPendingMutations, getPendingCount, pruneFailedMutations } from './queue';
import { mergeRemoteHistory, mergeRemoteProfile, mergeRemoteBodyweight, mergeRemoteRoutine, historyEntryToRemote } from './merge';
import { loadProfile, saveProfile } from '@/lib/db/profile';
import { loadAllBodyweight, saveBodyweight } from '@/lib/db/bodyweight';
import { loadMetaValue } from '@/lib/db/meta';
import { loadHevyArchiveSnapshot } from '@/lib/db/hevyArchive';
import { saveHistoryEntry } from '@/lib/db/history';
import { loadAllRoutineRecords, saveRoutine } from '@/lib/db/routines';
import { generateMarkdown } from '@/lib/markdown/generator';
import { computeHevyDigest } from '@/lib/hevy/digest';
import type { Bodyweight, HistoryEntry, RoutineData, UserProfile } from '@/types/workout';

const USER_ID = 'user-abc-123';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'entry-1',
    sessionIdx: 0,
    sessionTitle: 'Push A',
    completedAt: new Date('2025-01-15T10:00:00Z'),
    completedExercises: ['ex-1'],
    volumeData: [],
    totalVolume: 500,
    durationSeconds: 3600,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    displayName: 'Sierra',
    avatarEmoji: '🏋️',
    weightUnit: 'kg',
    heightCm: 165,
    defaultRestSeconds: 120,
    restDays: [],
    preferences: {
      trainingGoal: 'strength',
      experienceLevel: 'intermediate',
      weekStartsOn: 1,
      effortTracking: 'both',
      coachTone: 'supportive',
      accentColor: 'blue',
      uiDensity: 'comfortable',
      motionLevel: 'system',
      reducedMotion: false,
      language: 'es',
      streakReminderEnabled: false,
      streakReminderTime: '20:00',
      timerNotificationsEnabled: false,
      timezone: 'UTC',
    },
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeBodyweight(overrides: Partial<Bodyweight> = {}): Bodyweight {
  return {
    id: 'bw-1',
    date: '2026-01-10',
    weight: 82.4,
    unit: 'kg',
    updatedAt: '2026-01-10T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeRoutine(overrides: Partial<RoutineData> = {}): RoutineData {
  return {
    id: 'routine-1',
    title: 'Upper Day',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    sessions: [
      {
        id: 'session-1',
        title: 'Session 1',
        exercises: [
          {
            id: 'exercise-1',
            originalName: 'Bench Press',
            cleanName: 'Bench Press',
            sets: 3,
            repsMin: 8,
            repsMax: 10,
            restSeconds: 90,
            mediaUrl: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ── Test lifecycle ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  resetDBSingleton();
  vi.clearAllMocks();
  setQueryResult('history', { data: [], error: null });
  setQueryResult('profiles', { data: [], error: null });
  setQueryResult('bodyweight', { data: [], error: null });
  setQueryResult('routines', { data: [], error: null });
  setQueryResult('sync_cursors', { data: null, error: null });
  setQueryResult('hevy_archives', { data: [], error: null });
});

afterEach(() => {
  resetDBSingleton();
});

// ── Queue tests ──────────────────────────────────────────────────────────────

describe('sync queue', () => {
  it('enqueues and retrieves a pending mutation', async () => {
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e1' } });
    const pending = await getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0].table).toBe('history');
    expect(pending[0].operation).toBe('upsert');
    expect(pending[0].retries).toBe(0);
  });

  it('dequeues a mutation by id', async () => {
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e1' } });
    const [item] = await getPendingMutations();
    await dequeue(item.id);
    const remaining = await getPendingMutations();
    expect(remaining).toHaveLength(0);
  });

  it('getPendingCount reflects queue length', async () => {
    expect(await getPendingCount()).toBe(0);
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e1' } });
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e2' } });
    expect(await getPendingCount()).toBe(2);
  });

  it('pruneFailedMutations removes items exceeding maxRetries', async () => {
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e1' } });
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e2' } });

    // Manually bump retries on e1 beyond threshold
    const { incrementRetry } = await import('./queue');
    const [item1] = await getPendingMutations();
    await incrementRetry(item1.id);
    await incrementRetry(item1.id);
    await incrementRetry(item1.id);

    await pruneFailedMutations(2); // prune anything with retries > 2
    const remaining = await getPendingMutations();
    expect(remaining).toHaveLength(1);
  });
});

// ── pushToCloud tests ────────────────────────────────────────────────────────

describe('pushToCloud', () => {
  it('drains queue and calls upsert for each mutation', async () => {
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e1' } });
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e2' } });

    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('history');
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(await getPendingCount()).toBe(0);
  });

  it('is a no-op when queue is empty', async () => {
    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('pushes profile mutations to the profiles table', async () => {
    await saveProfile(makeProfile({ displayName: 'Latest Local Profile' }));
    await enqueue({
      table: 'profile',
      operation: 'upsert',
      payload: makeProfile({ displayName: 'Stale Queued Profile' }),
    });

    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        display_name: 'Latest Local Profile',
      }),
      { onConflict: 'user_id' }
    );
  });

  it('retries profile upsert without onConflict when user_id is not unique remotely', async () => {
    await saveProfile(makeProfile({ displayName: 'Latest Local Profile' }));
    await enqueue({
      table: 'profile',
      operation: 'upsert',
      payload: makeProfile({ displayName: 'Stale Queued Profile' }),
    });
    mockUpsert
      .mockResolvedValueOnce({
        error: { message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification' },
      })
      .mockResolvedValueOnce({ error: null });

    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);

    expect(mockUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ user_id: USER_ID }),
      { onConflict: 'user_id' }
    );
    expect(mockUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ user_id: USER_ID })
    );
    expect(await getPendingCount()).toBe(0);
  });

  it('retries profile upsert with a legacy payload when newer columns are missing remotely', async () => {
    await saveProfile(makeProfile({ displayName: 'Legacy Remote Profile' }));
    await enqueue({
      table: 'profile',
      operation: 'upsert',
      payload: makeProfile(),
    });
    mockUpsert
      .mockResolvedValueOnce({
        error: { message: "Could not find the 'preferences' column of 'profiles' in the schema cache" },
      })
      .mockResolvedValueOnce({ error: null });

    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);

    expect(mockUpsert).toHaveBeenNthCalledWith(
      2,
      {
        user_id: USER_ID,
        display_name: 'Legacy Remote Profile',
        avatar_emoji: '🏋️',
        weight_unit: 'kg',
      },
      { onConflict: 'user_id' }
    );
    expect(await getPendingCount()).toBe(0);
  });

  it('pushes bodyweight upserts and delete tombstones', async () => {
    await saveBodyweight(makeBodyweight({ id: 'bw-upsert', date: '2026-01-10' }));
    await enqueue({
      table: 'bodyweight',
      operation: 'upsert',
      payload: makeBodyweight({ id: 'bw-upsert', date: '2026-01-10' }),
    });
    await enqueue({
      table: 'bodyweight',
      operation: 'delete',
      payload: makeBodyweight({
        id: 'bw-delete',
        deletedAt: '2026-01-11T12:00:00.000Z',
        updatedAt: '2026-01-11T12:00:00.000Z',
      }),
    });

    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('bodyweight');
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    const tombstoneCall = mockUpsert.mock.calls.find(([payload]) => (
      (payload as Record<string, unknown>).deleted_at !== null
    ));
    expect(tombstoneCall?.[0]).toEqual(
      expect.objectContaining({
        user_id: USER_ID,
        deleted_at: '2026-01-11T12:00:00.000Z',
      })
    );
    expect(await getPendingCount()).toBe(0);
  });

  it('keeps a failed mutation in the queue and increments retries', async () => {
    await enqueue({ table: 'history', operation: 'upsert', payload: { id: 'e1' } });
    mockUpsert.mockResolvedValueOnce({ error: { message: 'boom' } });

    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);

    const pending = await getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0].retries).toBe(1);
  });

  it('pushes routine mutations to the routines table', async () => {
    const routine = makeRoutine();
    await saveRoutine(routine, generateMarkdown(routine));
    await enqueue({
      table: 'routines',
      operation: 'upsert',
      payload: { id: routine.id },
    });

    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('routines');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: routine.id,
        user_id: USER_ID,
        title: routine.title,
      }),
      { onConflict: 'id' }
    );
  });
});

// ── pullFromCloud tests ──────────────────────────────────────────────────────

describe('pullFromCloud', () => {
  it('returns 0 when remote returns empty result', async () => {
    // getCursor → returns epoch
    setQueryResult('sync_cursors', { data: null, error: null });
    setQueryResult('history', { data: [], error: null });
    setQueryResult('profiles', { data: [], error: null });
    setQueryResult('bodyweight', { data: [], error: null });
    setQueryResult('routines', { data: [], error: null });
    setQueryResult('hevy_archives', { data: [], error: null });

    const { pullFromCloud } = await import('./syncEngine');
    const merged = await pullFromCloud(USER_ID);
    expect(merged).toBe(0);
  });

  it('inserts new remote records into IDB', async () => {
    const remoteRow = {
      id: 'remote-1',
      user_id: USER_ID,
      session_idx: 0,
      session_title: 'Pull A',
      completed_at: '2025-01-20T08:00:00Z',
      synced_at: '2025-01-20T08:01:00Z',
      total_volume: 400,
      duration_secs: 2700,
      volume_data: [],
      notes: null,
      deleted_at: null,
    };

    setQueryResult('sync_cursors', { data: null, error: null });
    setQueryResult('history', { data: [remoteRow], error: null });
    setQueryResult('profiles', { data: [], error: null });
    setQueryResult('bodyweight', { data: [], error: null });
    setQueryResult('routines', { data: [], error: null });
    setQueryResult('hevy_archives', { data: [], error: null });

    const { pullFromCloud } = await import('./syncEngine');
    const merged = await pullFromCloud(USER_ID);
    expect(merged).toBe(1);
  });

  it('merges remote routines into the local library', async () => {
    const routine = makeRoutine({ id: 'routine-remote', title: 'Remote Routine' });
    const remoteRoutine = {
      id: routine.id,
      user_id: USER_ID,
      title: routine.title,
      source_md: generateMarkdown(routine),
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      deleted_at: null,
    };

    setQueryResult('sync_cursors', { data: null, error: null });
    setQueryResult('history', { data: [], error: null });
    setQueryResult('profiles', { data: [], error: null });
    setQueryResult('bodyweight', { data: [], error: null });
    setQueryResult('routines', { data: [remoteRoutine], error: null });
    setQueryResult('hevy_archives', { data: [], error: null });

    const { pullFromCloud } = await import('./syncEngine');
    const merged = await pullFromCloud(USER_ID);

    expect(merged).toBe(1);
    const saved = await loadAllRoutineRecords();
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe('Remote Routine');
  });

  it('falls back to a full bodyweight pull when Supabase is missing updated_at', async () => {
    const remoteBodyweight = {
      id: 'bw-legacy',
      user_id: USER_ID,
      date: '2026-02-10',
      weight: 81.5,
      unit: 'kg',
      created_at: '2026-02-10T09:00:00.000Z',
      deleted_at: null,
    };

    setQueryResult('sync_cursors', { data: null, error: null });
    setQueryResult('history', { data: [], error: null });
    setQueryResult('profiles', { data: [], error: null });
    setQueryResult('bodyweight', [
      {
        data: null,
        error: { message: 'column bodyweight.updated_at does not exist' },
      },
      { data: [remoteBodyweight], error: null },
    ]);
    setQueryResult('routines', { data: [], error: null });
    setQueryResult('hevy_archives', { data: [], error: null });

    const { pullFromCloud } = await import('./syncEngine');
    const merged = await pullFromCloud(USER_ID);

    expect(merged).toBe(1);
    const saved = await loadAllBodyweight();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: 'bw-legacy',
      date: '2026-02-10',
      weight: 81.5,
      updatedAt: '2026-02-10T09:00:00.000Z',
    });
  });

  it('throws when a remote table errors during pull', async () => {
    setQueryResult('sync_cursors', { data: null, error: null });
    setQueryResult('history', { data: [], error: null });
    setQueryResult('profiles', { data: [], error: { message: 'profiles exploded' } });
    setQueryResult('bodyweight', { data: [], error: null });
    setQueryResult('routines', { data: [], error: null });
    setQueryResult('hevy_archives', { data: [], error: null });

    const { pullFromCloud } = await import('./syncEngine');
    await expect(pullFromCloud(USER_ID)).rejects.toThrow('profiles exploded');
  });
});

describe('syncCloudData', () => {
  it('bootstraps existing local data on the first authenticated sync', async () => {
    await saveProfile(makeProfile({ displayName: 'Bootstrap Profile' }));
    const entry = makeEntry({ id: 'history-bootstrap' });
    const routine = makeRoutine({ id: 'routine-bootstrap', title: 'Bootstrap Routine' });
    await saveRoutine(routine, generateMarkdown(routine));
    await saveHistoryEntry(entry, 'routine-1', 'session-1');
    await saveBodyweight(makeBodyweight({ id: 'bw-bootstrap', date: '2026-02-01' }));

    setQueryResult('sync_cursors', { data: null, error: null });
    setQueryResult('history', { data: [], error: null });
    setQueryResult('profiles', { data: [], error: null });
    setQueryResult('bodyweight', { data: [], error: null });
    setQueryResult('routines', { data: [], error: null });
    setQueryResult('hevy_archives', { data: [], error: null });

    const { syncCloudData } = await import('./syncEngine');
    await syncCloudData(USER_ID);

    const upsertTables = mockFrom.mock.calls
      .filter(([table]) => table === 'profiles' || table === 'history' || table === 'bodyweight' || table === 'routines')
      .map(([table]) => table);

    expect(upsertTables).toContain('profiles');
    expect(upsertTables).toContain('history');
    expect(upsertTables).toContain('bodyweight');
    expect(upsertTables).toContain('routines');
    expect(await loadMetaValue(`cloud-sync-initialized:${USER_ID}`)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── merge tests ──────────────────────────────────────────────────────────────

describe('mergeRemoteHistory', () => {
  it('inserts a record when it does not exist locally', async () => {
    const remoteRow = {
      id: 'r1',
      user_id: USER_ID,
      session_idx: 1,
      session_title: 'Legs',
      completed_at: '2025-02-01T12:00:00Z',
      synced_at: '2025-02-01T12:01:00Z',
      total_volume: 1000,
      duration_secs: 4500,
      volume_data: null,
      notes: null,
      deleted_at: null,
    };
    const localMap = new Map<string, HistoryEntry>();
    const changed = await mergeRemoteHistory(remoteRow as never, localMap);
    expect(changed).toBe(true);
  });

  it('skips when local record is newer', async () => {
    const entry = makeEntry({ id: 'r1', completedAt: new Date('2025-02-10T12:00:00Z') });
    const remoteRow = {
      id: 'r1',
      user_id: USER_ID,
      session_idx: 0,
      session_title: 'Push A',
      completed_at: '2025-02-01T12:00:00Z', // older
      synced_at: '2025-02-01T12:01:00Z',
      total_volume: 500,
      duration_secs: null,
      volume_data: null,
      notes: null,
      deleted_at: null,
    };
    const localMap = new Map([['r1', entry]]);
    const changed = await mergeRemoteHistory(remoteRow as never, localMap);
    expect(changed).toBe(false);
  });

  it('overwrites when remote record is newer', async () => {
    const entry = makeEntry({ id: 'r1', completedAt: new Date('2025-01-01T12:00:00Z') });
    const remoteRow = {
      id: 'r1',
      user_id: USER_ID,
      session_idx: 0,
      session_title: 'Push A updated',
      completed_at: '2025-02-10T12:00:00Z', // newer
      synced_at: '2025-02-10T12:01:00Z',
      total_volume: 700,
      duration_secs: 3600,
      volume_data: [],
      notes: null,
      deleted_at: null,
    };
    const localMap = new Map([['r1', entry]]);
    const changed = await mergeRemoteHistory(remoteRow as never, localMap);
    expect(changed).toBe(true);
  });
});

describe('mergeRemoteProfile', () => {
  it('applies a newer remote profile', async () => {
    await saveProfile(makeProfile({
      displayName: 'Local',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }));

    const remoteRow = {
      user_id: USER_ID,
      display_name: 'Remote',
      avatar_emoji: '🔥',
      weight_unit: 'lbs',
      height_cm: 181,
      default_rest_s: 150,
      rest_days: [0, 2],
      preferences: {
        trainingGoal: 'hypertrophy',
        experienceLevel: 'advanced',
        weekStartsOn: 0,
        effortTracking: 'rir',
        coachTone: 'direct',
        accentColor: 'orange',
        uiDensity: 'compact',
        motionLevel: 'reduced',
      },
      updated_at: '2025-02-01T00:00:00.000Z',
    };

    const changed = await mergeRemoteProfile(remoteRow as never);
    expect(changed).toBe(true);

    const saved = await loadProfile();
    expect(saved.displayName).toBe('Remote');
    expect(saved.weightUnit).toBe('lbs');
    expect(saved.preferences.trainingGoal).toBe('hypertrophy');
    expect(saved.updatedAt).toBe('2025-02-01T00:00:00.000Z');
  });

  it('skips an older remote profile', async () => {
    await saveProfile(makeProfile({
      displayName: 'Local',
      updatedAt: '2025-03-01T00:00:00.000Z',
    }));

    const remoteRow = {
      user_id: USER_ID,
      display_name: 'Remote',
      avatar_emoji: '🔥',
      weight_unit: 'lbs',
      height_cm: 181,
      default_rest_s: 150,
      rest_days: [0, 2],
      preferences: {
        trainingGoal: 'hypertrophy',
        experienceLevel: 'advanced',
        weekStartsOn: 0,
        effortTracking: 'rir',
        coachTone: 'direct',
        accentColor: 'orange',
        uiDensity: 'compact',
        motionLevel: 'reduced',
      },
      updated_at: '2025-02-01T00:00:00.000Z',
    };

    const changed = await mergeRemoteProfile(remoteRow as never);
    expect(changed).toBe(false);

    const saved = await loadProfile();
    expect(saved.displayName).toBe('Local');
  });
});

describe('mergeRemoteBodyweight', () => {
  it('writes a newer remote bodyweight record', async () => {
    const remoteRow = {
      id: 'bw-remote',
      user_id: USER_ID,
      date: '2025-03-01',
      weight: 84.2,
      unit: 'kg',
      created_at: '2025-03-01T10:00:00.000Z',
      updated_at: '2025-03-01T10:05:00.000Z',
      deleted_at: null,
    };

    const changed = await mergeRemoteBodyweight(remoteRow as never, new Map());
    expect(changed).toBe(true);

    const saved = await loadAllBodyweight();
    expect(saved).toHaveLength(1);
    expect(saved[0].weight).toBe(84.2);
  });

  it('deletes a local bodyweight entry when the remote tombstone is newer', async () => {
    const local = makeBodyweight({
      id: 'bw-local',
      date: '2025-04-01',
      updatedAt: '2025-04-01T08:00:00.000Z',
    });
    await saveBodyweight(local);

    const remoteRow = {
      id: 'bw-local',
      user_id: USER_ID,
      date: '2025-04-01',
      weight: 84.2,
      unit: 'kg',
      created_at: '2025-04-01T08:00:00.000Z',
      updated_at: '2025-04-01T08:00:00.000Z',
      deleted_at: '2025-04-01T09:00:00.000Z',
    };

    const changed = await mergeRemoteBodyweight(remoteRow as never, new Map([[local.date, local]]));
    expect(changed).toBe(true);

    const saved = await loadAllBodyweight();
    expect(saved).toHaveLength(0);
  });
});

describe('mergeRemoteRoutine', () => {
  it('writes a newer remote routine into the local library', async () => {
    const routine = makeRoutine({ id: 'routine-merge', title: 'Merged Routine' });
    const remoteRoutine = {
      id: routine.id,
      user_id: USER_ID,
      title: routine.title,
      source_md: generateMarkdown(routine),
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-03T00:00:00.000Z',
      deleted_at: null,
    };

    const changed = await mergeRemoteRoutine(remoteRoutine as never, new Map());
    expect(changed).toBe(true);

    const saved = await loadAllRoutineRecords();
    expect(saved).toHaveLength(1);
    expect(saved[0].updatedAt).toBe('2026-01-03T00:00:00.000Z');
  });
});

describe('mergeRemoteHevyArchive', () => {
  it('persists the remote archive locally', async () => {
    const { mergeRemoteHevyArchive } = await import('./merge');
    const digest = computeHevyDigest([], new Date('2026-05-08T00:00:00.000Z'));
    const remoteRow = {
      user_id: USER_ID,
      raw_archive: [],
      digest,
      imported_at: digest.importedAt,
      updated_at: digest.importedAt,
    };

    const changed = await mergeRemoteHevyArchive(remoteRow as never);
    expect(changed).toBe(true);

    const saved = await loadHevyArchiveSnapshot();
    expect(saved?.importedAt).toBe(digest.importedAt);
    expect(saved?.digest.totalWorkouts).toBe(0);
  });
});

// ── historyEntryToRemote tests ───────────────────────────────────────────────

describe('historyEntryToRemote', () => {
  it('maps HistoryEntry fields to remote schema correctly', () => {
    const entry = makeEntry();
    const remote = historyEntryToRemote(entry, USER_ID);
    expect(remote.id).toBe('entry-1');
    expect(remote.user_id).toBe(USER_ID);
    expect(remote.session_idx).toBe(0);
    expect(remote.session_title).toBe('Push A');
    expect(remote.total_volume).toBe(500);
    expect(remote.duration_secs).toBe(3600);
    expect(typeof remote.completed_at).toBe('string');
  });
});

// ── Nutrition profile sync ───────────────────────────────────────────────────

import { nutritionProfileToRemote, mergeRemoteNutritionProfile } from './merge';
import { saveNutritionProfile, loadNutritionProfile } from '@/lib/db/nutritionProfile';
import type { NutritionProfile } from '@/types/nutrition';

function makeNutritionProfile(overrides: Partial<NutritionProfile> = {}): NutritionProfile {
  return {
    weightKg: 80,
    heightCm: 180,
    ageYears: 30,
    sex: 'male',
    activityLevel: 'moderate',
    goal: 'bulk',
    experience: 'intermediate',
    bodyFatPct: null,
    trainingDaysPerWeek: 4,
    trainingType: 'hypertrophy',
    trainingTime: 'evening',
    dietaryRestrictions: [],
    customRestrictions: [],
    budget: 'medium',
    bmrKcal: 1780,
    tdeeKcal: 2759,
    targetKcal: 3035,
    proteinG: 160,
    fatsG: 90,
    carbsG: 395,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('nutritionProfileToRemote', () => {
  it('maps camelCase IDB fields to snake_case Supabase row', () => {
    const remote = nutritionProfileToRemote(makeNutritionProfile(), USER_ID);
    expect(remote.user_id).toBe(USER_ID);
    expect(remote.weight_kg).toBe(80);
    expect(remote.height_cm).toBe(180);
    expect(remote.activity_level).toBe('moderate');
    expect(remote.training_days).toBe(4);
    expect(remote.training_type).toBe('hypertrophy');
    expect(remote.target_kcal).toBe(3035);
  });
});

describe('mergeRemoteNutritionProfile', () => {
  it('persists a newer remote profile (last-write-wins)', async () => {
    const local = makeNutritionProfile({ updatedAt: '2026-01-01T00:00:00.000Z', targetKcal: 3000 });
    await saveNutritionProfile(local);

    const remoteRow = {
      ...nutritionProfileToRemote(makeNutritionProfile({ targetKcal: 3500 }), USER_ID),
      updated_at: '2026-02-01T00:00:00.000Z',
      created_at: local.createdAt,
      deleted_at: null,
    };

    const changed = await mergeRemoteNutritionProfile(remoteRow as never);
    expect(changed).toBe(true);

    const after = await loadNutritionProfile();
    expect(after?.targetKcal).toBe(3500);
    expect(after?.updatedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('ignores remote rows older than local', async () => {
    const local = makeNutritionProfile({ updatedAt: '2026-03-01T00:00:00.000Z', targetKcal: 3200 });
    await saveNutritionProfile(local);

    const remoteRow = {
      ...nutritionProfileToRemote(makeNutritionProfile({ targetKcal: 9999 }), USER_ID),
      updated_at: '2026-01-01T00:00:00.000Z',
      created_at: local.createdAt,
      deleted_at: null,
    };

    const changed = await mergeRemoteNutritionProfile(remoteRow as never);
    expect(changed).toBe(false);

    const after = await loadNutritionProfile();
    expect(after?.targetKcal).toBe(3200);
  });
});

describe('saveNutritionProfile', () => {
  it('persists locally and enqueues a sync mutation', async () => {
    await saveNutritionProfile(makeNutritionProfile());
    const pending = await getPendingMutations();
    expect(pending.some((m) => m.table === 'nutritionProfile' && m.operation === 'upsert')).toBe(true);
  });
});
