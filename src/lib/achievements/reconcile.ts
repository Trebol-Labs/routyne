import { buildWorkoutSummary } from '@/lib/analytics/session-compare';
import {
  loadEarnedAchievementIds,
  loadEarnedAchievements,
  saveAchievement,
} from '@/lib/db/achievements';
import { loadAllHistory } from '@/lib/db/history';
import { loadProfile } from '@/lib/db/profile';
import type { AchievementRecord } from '@/lib/db/schema';
import type { HistoryEntry, UserProfile } from '@/types/workout';
import { evaluateAchievements } from './evaluator';

const NON_REPLAYABLE_ACHIEVEMENT_IDS = new Set([
  // History stores completed sets, but not the originally planned set count.
  // Replaying this from synced history would incorrectly mark every logged
  // session with completed sets as perfect.
  'perfect-session',
]);

function completedSetCount(entry: HistoryEntry): number {
  return entry.volumeData.reduce((sum, volume) => sum + volume.setsCompleted, 0);
}

function sortOldestFirst(history: HistoryEntry[]): HistoryEntry[] {
  return [...history].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
}

export function findReplayableAchievements(
  history: HistoryEntry[],
  earnedIds: Set<string>,
  profile: Pick<UserProfile, 'restDays' | 'preferences'>,
): string[] {
  if (history.length === 0) {
    return [];
  }

  const replayEarnedIds = new Set(earnedIds);
  const unlockedIds: string[] = [];
  const replayHistoryNewestFirst: HistoryEntry[] = [];

  for (const entry of sortOldestFirst(history)) {
    const priorHistory = [...replayHistoryNewestFirst];
    replayHistoryNewestFirst.unshift(entry);

    const summary = buildWorkoutSummary(
      entry,
      priorHistory,
      completedSetCount(entry),
      entry.durationSeconds ?? 0,
    );

    const unlocked = evaluateAchievements({
      history: replayHistoryNewestFirst,
      summary,
      earnedIds: replayEarnedIds,
      profile,
    });

    for (const achievement of unlocked) {
      if (NON_REPLAYABLE_ACHIEVEMENT_IDS.has(achievement.id)) {
        continue;
      }
      replayEarnedIds.add(achievement.id);
      unlockedIds.push(achievement.id);
    }
  }

  return unlockedIds;
}

export async function reconcileAchievementsFromHistory(): Promise<AchievementRecord[]> {
  const [history, earnedIds, profile] = await Promise.all([
    loadAllHistory(),
    loadEarnedAchievementIds(),
    loadProfile(),
  ]);
  const unlockedIds = findReplayableAchievements(history, earnedIds, profile);

  if (unlockedIds.length > 0) {
    await Promise.all(unlockedIds.map((id) => saveAchievement(id)));
  }

  return loadEarnedAchievements();
}
