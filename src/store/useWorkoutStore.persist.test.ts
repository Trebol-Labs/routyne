import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDBSingleton } from '@/lib/db/index';

const mockRoutine = {
  id: 'r1', title: 'Test', createdAt: new Date(),
  sessions: [{ id: 's1', title: 'Day A', exercises: [] }],
};

beforeEach(() => {
  vi.resetModules();
  resetDBSingleton();
  // Fresh in-memory IDB per test — avoids blocked deleteDB from in-flight transactions
  vi.stubGlobal('indexedDB', new IDBFactory());
});

describe('IDB persistence', () => {
  it('survives a module reload: history entry is present and completedAt is a Date', async () => {
    const { useWorkoutStore: store1 } = await import('@/store/useWorkoutStore');
    store1.getState().setCurrentRoutine(mockRoutine);
    store1.getState().startSession(0);
    await store1.getState().finishSession();  // awaits IDB write

    expect(store1.getState().history).toHaveLength(1);

    // Simulate page reload
    vi.resetModules();
    resetDBSingleton();
    const { useWorkoutStore: store2 } = await import('@/store/useWorkoutStore');
    await store2.getState().hydrate();

    const entry = store2.getState().history[0];
    expect(entry).toBeDefined();
    expect(entry.completedAt).toBeInstanceOf(Date);
  });

  it('does NOT restore transient state: currentView defaults to uploader', async () => {
    const { useWorkoutStore: store1 } = await import('@/store/useWorkoutStore');
    store1.getState().setCurrentView('active-session');

    vi.resetModules();
    resetDBSingleton();
    const { useWorkoutStore: store2 } = await import('@/store/useWorkoutStore');

    // Before hydration, default view must be uploader
    expect(store2.getState().currentView).toBe('uploader');
  });
});
