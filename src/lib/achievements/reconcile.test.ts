import { describe, expect, it } from 'vitest';
import { loadEarnedAchievements } from '@/lib/db/achievements';
import { saveHistoryEntry } from '@/lib/db/history';
import type { HistoryEntry } from '@/types/workout';
import { findReplayableAchievements, reconcileAchievementsFromHistory } from './reconcile';

function makeEntry(index: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  const completedAt = new Date(Date.UTC(2026, 0, 1 + index * 2, 12));
  return {
    id: `entry-${index}`,
    sessionIdx: 0,
    sessionTitle: 'Synced Workout',
    completedAt,
    completedExercises: [`exercise-${index}`],
    volumeData: [
      {
        exerciseId: `exercise-${index}`,
        cleanName: `Exercise ${index}`,
        setsCompleted: 1,
        totalReps: 10,
        totalVolume: 0,
        setDetails: [],
      },
    ],
    totalVolume: 0,
    durationSeconds: 1800,
    ...overrides,
  };
}

describe('findReplayableAchievements', () => {
  it('unlocks session trophies from synced history thresholds', () => {
    const history = Array.from({ length: 38 }, (_, index) => makeEntry(index));

    const unlocked = findReplayableAchievements(history, new Set());

    expect(unlocked).toEqual(expect.arrayContaining([
      'first-session',
      'sessions-5',
      'sessions-10',
      'sessions-25',
    ]));
    expect(unlocked).not.toContain('sessions-50');
  });

  it('does not infer perfect sessions from replayed history', () => {
    const unlocked = findReplayableAchievements([
      makeEntry(0, {
        volumeData: [
          {
            exerciseId: 'exercise-20-sets',
            cleanName: 'Twenty Set Lift',
            setsCompleted: 20,
            totalReps: 200,
            totalVolume: 2000,
            setDetails: [],
          },
        ],
        totalVolume: 2000,
        durationSeconds: 6000,
      }),
    ], new Set());

    expect(unlocked).toEqual(expect.arrayContaining([
      'session-volume-1000',
      'marathon-session',
      'sets-20',
    ]));
    expect(unlocked).not.toContain('perfect-session');
  });
});

describe('reconcileAchievementsFromHistory', () => {
  it('persists missing trophies after history has been synced into IDB', async () => {
    for (let index = 0; index < 6; index++) {
      await saveHistoryEntry(makeEntry(index), 'routine-1', 'session-1');
    }

    const records = await reconcileAchievementsFromHistory();
    const ids = records.map((record) => record.id);

    expect(ids).toEqual(expect.arrayContaining([
      'first-session',
      'sessions-5',
      'exercises-5',
    ]));
    expect(await loadEarnedAchievements()).toHaveLength(records.length);
  });
});
