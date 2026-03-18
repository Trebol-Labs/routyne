import { getDB } from './index';
import type { AchievementRecord } from './schema';

export async function loadEarnedAchievements(): Promise<AchievementRecord[]> {
  const db = await getDB();
  return db.getAll('achievements');
}

export async function loadEarnedAchievementIds(): Promise<Set<string>> {
  const records = await loadEarnedAchievements();
  return new Set(records.map((r) => r.id));
}

export async function saveAchievement(id: string): Promise<void> {
  const db = await getDB();
  await db.put('achievements', { id, earnedAt: new Date().toISOString() });
}

export async function deleteAllAchievements(): Promise<void> {
  const db = await getDB();
  await db.clear('achievements');
}
