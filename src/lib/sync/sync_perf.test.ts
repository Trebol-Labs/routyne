import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDBSingleton } from '@/lib/db/index';

// A mock that delays for 10ms to simulate network
const mockUpsert = vi.fn().mockImplementation(async () => {
  await new Promise(resolve => setTimeout(resolve, 10));
  return { error: null };
});
const mockUpdate = vi.fn().mockImplementation(async () => {
  await new Promise(resolve => setTimeout(resolve, 10));
  return { error: null };
});
const mockEq = vi.fn().mockReturnValue({ update: mockUpdate });

const createBuilder = () => {
  return { upsert: mockUpsert, update: mockUpdate, eq: mockEq };
};
const mockFrom = vi.fn(() => createBuilder());

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

import { enqueue } from './queue';
import { pushToCloud } from './syncEngine';

describe('Performance measurement', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    resetDBSingleton();
    vi.clearAllMocks();
  });

  it('measures baseline performance', async () => {
    for (let i = 0; i < 50; i++) {
      await enqueue({ table: 'history', operation: 'upsert', payload: { id: `e${i}` } });
    }

    const start = performance.now();
    await pushToCloud('user-abc-123');
    const duration = performance.now() - start;

    console.log(`Duration: ${duration}ms`);
    expect(duration).toBeGreaterThan(0);
  });
});
