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

  it('persists nutrition entries and goals across hydration', async () => {
    const { useWorkoutStore: store1 } = await import('@/store/useWorkoutStore');
    await store1.getState().updateNutritionGoal({
      calories: 2600,
      proteinGrams: 190,
      carbsGrams: 280,
      fatGrams: 85,
    });
    await store1.getState().saveNutritionEntry({
      date: new Date().toISOString().slice(0, 10),
      mealType: 'lunch',
      foodName: 'Chicken rice bowl',
      servingLabel: '1 bowl',
      calories: 640,
      proteinGrams: 48,
      carbsGrams: 72,
      fatGrams: 16,
    });

    expect(store1.getState().nutritionEntries).toHaveLength(1);

    vi.resetModules();
    resetDBSingleton();
    const { useWorkoutStore: store2 } = await import('@/store/useWorkoutStore');
    await store2.getState().hydrate();

    expect(store2.getState().nutritionGoal.calories).toBe(2600);
    expect(store2.getState().nutritionEntries).toHaveLength(1);
    expect(store2.getState().nutritionEntries[0].foodName).toBe('Chicken rice bowl');
  });
});
