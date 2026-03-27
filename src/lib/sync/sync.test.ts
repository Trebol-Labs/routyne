/**
 * Sync engine tests — Supabase client is mocked via vi.mock.
 * IDB operations use fake-indexeddb (patched in src/test/setup.ts).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDBSingleton } from '@/lib/db/index';

// ── Mock Supabase ────────────────────────────────────────────────────────────

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGt = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn(() => ({
  upsert: mockUpsert,
  update: mockUpdate.mockReturnValue({ eq: mockEq }),
  select: mockSelect.mockReturnValue({
    eq: mockEq.mockReturnValue({
      single: mockSingle,
      gt: mockGt.mockReturnValue({
        order: mockOrder,
      }),
    }),
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { enqueue, dequeue, getPendingMutations, getPendingCount, pruneFailedMutations } from './queue';
import { mergeRemoteHistory, historyEntryToRemote } from './merge';
import type { HistoryEntry } from '@/types/workout';

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

// ── Test lifecycle ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  resetDBSingleton();
  vi.clearAllMocks();
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
});

// ── pullFromCloud tests ──────────────────────────────────────────────────────

describe('pullFromCloud', () => {
  it('returns 0 when remote returns empty result', async () => {
    // getCursor → returns epoch
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    // pull query → no remote rows
    mockOrder.mockResolvedValueOnce({ data: [], error: null });
    // updateCursor upsert
    mockUpsert.mockResolvedValueOnce({ error: null });

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

    // getCursor
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    // pull query returns 1 remote row
    mockOrder.mockResolvedValueOnce({ data: [remoteRow], error: null });
    // updateCursor
    mockUpsert.mockResolvedValueOnce({ error: null });

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
