import { getDB } from './index';
import type { BodyweightRecord } from './schema';

export async function saveBodyweight(entry: BodyweightRecord): Promise<void> {
  const db = await getDB();
  const existing = await db.getAllFromIndex('bodyweight', 'by-date', entry.date);
  await Promise.all(existing.map((record) => db.delete('bodyweight', record.id)));
  await db.put('bodyweight', entry);
}

export async function loadBodyweightHistory(limit = 60): Promise<BodyweightRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('bodyweight', 'by-date');
  // getAllFromIndex returns ascending; reverse for newest-first then cap
  return all.reverse().slice(0, limit);
}

export async function loadAllBodyweight(): Promise<BodyweightRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('bodyweight', 'by-date');
}

export async function getLatestBodyweight(): Promise<BodyweightRecord | null> {
  const db = await getDB();
  const all = await db.getAllFromIndex('bodyweight', 'by-date');
  return all[all.length - 1] ?? null;
}

export async function deleteBodyweightEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bodyweight', id);
}

export async function deleteBodyweightEntriesByDate(date: string): Promise<void> {
  const db = await getDB();
  const existing = await db.getAllFromIndex('bodyweight', 'by-date', date);
  await Promise.all(existing.map((record) => db.delete('bodyweight', record.id)));
}
