import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let storage: Record<string, string> = {};

beforeEach(() => {
  storage = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { storage = {}; },
    get length() { return Object.keys(storage).length; },
    key: (i: number) => Object.keys(storage)[i] ?? null,
  });
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('persist middleware', () => {
  it('survives a module reload: history entry is present and completedAt is a Date', async () => {
    // First "session" — load store, add a history entry via finishSession
    const { useWorkoutStore: store1 } = await import('@/store/useWorkoutStore');
    const mockRoutine = {
      id: 'r1', title: 'Test', createdAt: new Date(),
      sessions: [{ id: 's1', title: 'Day A', exercises: [] }],
    };
    store1.getState().setCurrentRoutine(mockRoutine);
    store1.getState().finishSession();
    expect(store1.getState().history).toHaveLength(1);

    // Simulate page reload by resetting module cache, then re-importing
    vi.resetModules();
    const { useWorkoutStore: store2 } = await import('@/store/useWorkoutStore');
    const entry = store2.getState().history[0];
    expect(entry).toBeDefined();
    expect(entry.completedAt).toBeInstanceOf(Date); // must be Date, not string
  });

  it('does NOT persist transient state: currentView resets to default', async () => {
    const { useWorkoutStore: store1 } = await import('@/store/useWorkoutStore');
    store1.getState().setCurrentView('active-session');

    // Simulate page reload
    vi.resetModules();
    const { useWorkoutStore: store2 } = await import('@/store/useWorkoutStore');
    expect(store2.getState().currentView).toBe('uploader');
  });
});
