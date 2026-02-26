import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkoutStore } from '@/store/useWorkoutStore';

const mockRoutine = {
  id: 'r1', title: 'Test', createdAt: new Date(),
  sessions: [{
    id: 's1', title: 'Day A',
    exercises: [
      { id: 'ex-1', cleanName: 'Squat', originalName: 'Squat', sets: 3, repsMin: 8, repsMax: 10, restSeconds: 90, mediaUrl: null },
      { id: 'ex-2', cleanName: 'Push-up', originalName: 'Push-up', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60, mediaUrl: null },
    ],
  }],
};

beforeEach(() => {
  useWorkoutStore.getState().resetAll();
  useWorkoutStore.getState().setCurrentRoutine(mockRoutine);
  useWorkoutStore.getState().startSession(0);
});

it('computes totalReps and totalVolume per exercise', () => {
  useWorkoutStore.getState().toggleSetCompletion(0, 'ex-1', 0, 10, 60);
  useWorkoutStore.getState().toggleSetCompletion(0, 'ex-1', 1, 10, 60);
  useWorkoutStore.getState().finishSession();
  const entry = useWorkoutStore.getState().history[0];
  expect(entry.volumeData[0].totalReps).toBe(20);
  expect(entry.volumeData[0].totalVolume).toBe(1200);
  expect(entry.totalVolume).toBe(1200);
});

it('handles bodyweight (no weight) without NaN', () => {
  useWorkoutStore.getState().toggleSetCompletion(0, 'ex-2', 0, 12, undefined);
  useWorkoutStore.getState().finishSession();
  const vol = useWorkoutStore.getState().history[0].volumeData[0];
  expect(vol.totalVolume).toBe(0);
  expect(vol.totalVolume).not.toBeNaN();
});

it('counts only completed sets', () => {
  useWorkoutStore.getState().toggleSetCompletion(0, 'ex-1', 0, 10, 60);
  useWorkoutStore.getState().toggleSetCompletion(0, 'ex-1', 1, 10, 60);
  // set index 2 not toggled
  useWorkoutStore.getState().finishSession();
  expect(useWorkoutStore.getState().history[0].volumeData[0].setsCompleted).toBe(2);
});
