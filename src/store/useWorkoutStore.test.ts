import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkoutStore } from '@/store/useWorkoutStore';

const mockRoutine = {
  id: 'r1',
  title: 'Test Routine',
  createdAt: new Date(),
  sessions: [
    { id: 's1', title: 'Day A', exercises: [] },
    { id: 's2', title: 'Day B', exercises: [] },
  ],
};

beforeEach(() => {
  useWorkoutStore.getState().resetAll();
});

describe('setCurrentRoutine', () => {
  it('transitions view to routine-overview', () => {
    useWorkoutStore.getState().setCurrentRoutine(mockRoutine);
    expect(useWorkoutStore.getState().currentView).toBe('routine-overview');
  });

  it('stores the routine in state', () => {
    useWorkoutStore.getState().setCurrentRoutine(mockRoutine);
    expect(useWorkoutStore.getState().currentRoutine?.id).toBe('r1');
  });
});

describe('resetAll', () => {
  it('clears history', () => {
    useWorkoutStore.getState().setCurrentRoutine(mockRoutine);
    useWorkoutStore.getState().finishSession();
    expect(useWorkoutStore.getState().history).toHaveLength(1);

    useWorkoutStore.getState().resetAll();
    expect(useWorkoutStore.getState().history).toHaveLength(0);
  });

  it('resets currentView to uploader', () => {
    useWorkoutStore.getState().setCurrentRoutine(mockRoutine);
    expect(useWorkoutStore.getState().currentView).toBe('routine-overview');

    useWorkoutStore.getState().resetAll();
    expect(useWorkoutStore.getState().currentView).toBe('uploader');
  });

  it('clears currentRoutine', () => {
    useWorkoutStore.getState().setCurrentRoutine(mockRoutine);
    useWorkoutStore.getState().resetAll();
    expect(useWorkoutStore.getState().currentRoutine).toBeNull();
  });
});
