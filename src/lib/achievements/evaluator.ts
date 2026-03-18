import { ACHIEVEMENTS, type AchievementContext } from './definitions';
import type { AchievementDefinition } from '@/types/workout';

/**
 * Evaluates which achievements were newly unlocked by the just-completed session.
 * Returns only the *new* achievements (not already in earnedIds).
 */
export function evaluateAchievements(ctx: AchievementContext): AchievementDefinition[] {
  const unlocked: AchievementDefinition[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (ctx.earnedIds.has(achievement.id)) continue;
    try {
      if (achievement.check(ctx)) {
        unlocked.push(achievement);
      }
    } catch {
      // silently skip any evaluation errors
    }
  }

  return unlocked;
}
