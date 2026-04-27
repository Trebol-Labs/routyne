/**
 * Sync engine tests — Supabase client is mocked via vi.mock.
 * IDB operations use fake-indexeddb (patched in src/test/setup.ts).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDBSingleton } from '@/lib/db/index';

// ── Mock Supabase ────────────────────────────────────────────────────────────

const mockUpsert = vi.fn().mockResolvedValue({ error: null });

type QueryTable = 'history' | 'profiles' | 'bodyweight' | 'sync_cursors';
type QueryResult = { data: unknown; error: { message: string } | null };

const queryResults: Record<QueryTable, QueryResult> = {
  history: { data: [], error: null },
  profiles: { data: [], error: null },
  bodyweight: { data: [], error: null },
  sync_cursors: { data: null, error: null },
};

function setQueryResult(table: QueryTable, result: QueryResult): void {
  queryResults[table] = result;
}

function createBuilder(table: QueryTable) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(async () => queryResults.sync_cursors),
    upsert: mockUpsert,
    update: vi.fn(() => builder),
    then: (
      onFulfilled?: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(queryResults[table]).then(onFulfilled, onRejected),
  };
  return builder;
}

const mockFrom = vi.fn((table: string) => createBuilder(table as QueryTable));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { enqueue, dequeue, getPendingMutations, getPendingCount, pruneFailedMutations } from './queue';
import { mergeRemoteHistory, mergeRemoteProfile, mergeRemoteBodyweight, historyEntryToRemote } from './merge';
import { loadProfile, saveProfile } from '@/lib/db/profile';
import { loadAllBodyweight, saveBodyweight } from '@/lib/db/bodyweight';
import type { Bodyweight, HistoryEntry, UserProfile } from '@/types/workout';

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

// ── Test lifecycle ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  resetDBSingleton();
  vi.clearAllMocks();
  setQueryResult('history', { data: [], error: null });
  setQueryResult('profiles', { data: [], error: null });
  setQueryResult('bodyweight', { data: [], error: null });
  setQueryResult('sync_cursors', { data: null, error: null });
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
    await enqueue({
      table: 'profile',
      operation: 'upsert',
      payload: makeProfile({ displayName: 'Sync Me' }),
    });

    const { pushToCloud } = await import('./syncEngine');
    await pushToCloud(USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        display_name: 'Sync Me',
      }),
      { onConflict: 'user_id' }
    );
  });

  it('pushes bodyweight upserts and delete tombstones', async () => {
    await enqueue({
      table: 'bodyweight',
      operation: 'upsert',
      payload: makeBodyweight({ id: 'bw-upsert' }),
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
});

// ── pullFromCloud tests ──────────────────────────────────────────────────────

describe('pullFromCloud', () => {
  it('returns 0 when remote returns empty result', async () => {
    // getCursor → returns epoch
    setQueryResult('sync_cursors', { data: null, error: null });
    setQueryResult('history', { data: [], error: null });
    setQueryResult('profiles', { data: [], error: null });
    setQueryResult('bodyweight', { data: [], error: null });

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

    const { pullFromCloud } = await import('./syncEngine');
    const merged = await pullFromCloud(USER_ID);
    expect(merged).toBe(1);
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
