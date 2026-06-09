import { getDB } from './index';
import type { NutritionEntryRecord, NutritionGoalRecord } from './schema';

export const DEFAULT_NUTRITION_GOAL: NutritionGoalRecord = {
  id: 'default',
  calories: 2200,
  proteinGrams: 160,
  carbsGrams: 240,
  fatGrams: 70,
  updatedAt: new Date(0).toISOString(),
};

export async function loadNutritionGoal(): Promise<NutritionGoalRecord> {
  const db = await getDB();
  return (await db.get('nutritionGoals', 'default')) ?? DEFAULT_NUTRITION_GOAL;
}

export async function saveNutritionGoal(goal: NutritionGoalRecord): Promise<void> {
  const db = await getDB();
  await db.put('nutritionGoals', goal);
}

export async function saveNutritionEntry(entry: NutritionEntryRecord): Promise<void> {
  const db = await getDB();
  await db.put('nutritionEntries', entry);
}

export async function loadNutritionEntriesByDate(date: string): Promise<NutritionEntryRecord[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('nutritionEntries', 'by-date', date);
  return entries
    .filter((entry) => entry.deletedAt === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function loadNutritionCaloriesByDateRange(
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const db = await getDB();
  const range = IDBKeyRange.bound(startDate, endDate);
  const entries = await db.getAllFromIndex('nutritionEntries', 'by-date', range);

  return entries.reduce<Record<string, number>>((acc, entry) => {
    if (entry.deletedAt !== null) return acc;
    acc[entry.date] = (acc[entry.date] ?? 0) + entry.calories;
    return acc;
  }, {});
}

export async function loadNutritionEntry(id: string): Promise<NutritionEntryRecord | null> {
  const db = await getDB();
  return (await db.get('nutritionEntries', id)) ?? null;
}

export async function deleteNutritionEntry(id: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get('nutritionEntries', id);
  if (!entry) return;
  await db.put('nutritionEntries', {
    ...entry,
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  });
}
