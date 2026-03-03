import { getDB } from './index';
import type { HistoryRecord } from './schema';
import type { HistoryEntry, ExerciseVolume } from '@/types/workout';

// ── Converters ────────────────────────────────────────────────────────────────

function entryToRecord(
  entry: HistoryEntry,
  routineId: string,
  sessionId: string
): HistoryRecord {
  return {
    id: entry.id,
    routineId,
    sessionId,
    sessionTitle: entry.sessionTitle,
    completedAt: entry.completedAt instanceof Date
      ? entry.completedAt.toISOString()
      : String(entry.completedAt),
    totalVolume: entry.totalVolume,
    volumeData: entry.volumeData.map((ev) => ({
      exerciseId: ev.exerciseId,
      cleanName: ev.cleanName,
      setsCompleted: ev.setsCompleted,
      totalReps: ev.totalReps,
      totalVolume: ev.totalVolume,
      setDetails: [],  // populated when setCompletion is available
    })),
  };
}

function recordToEntry(r: HistoryRecord): HistoryEntry {
  return {
    id: r.id,
    sessionIdx: 0,            // not stored in IDB, fallback
    sessionTitle: r.sessionTitle,
    completedAt: new Date(r.completedAt),
    completedExercises: r.volumeData.map((ev) => ev.exerciseId),
    volumeData: r.volumeData.map((ev): ExerciseVolume => ({
      exerciseId: ev.exerciseId,
      cleanName: ev.cleanName,
      setsCompleted: ev.setsCompleted,
      totalReps: ev.totalReps,
      totalVolume: ev.totalVolume,
    })),
    totalVolume: r.totalVolume,
  };
}

// ── Operations ────────────────────────────────────────────────────────────────

export async function saveHistoryEntry(
  entry: HistoryEntry,
  routineId: string,
  sessionId: string
): Promise<void> {
  const db = await getDB();
  await db.put('history', entryToRecord(entry, routineId, sessionId));
}

/**
 * Load history sorted newest-first with optional cursor pagination.
 * Returns { entries, hasMore }.
 */
export async function loadHistory(
  limit = 50,
  beforeDate?: string
): Promise<{ entries: HistoryEntry[]; hasMore: boolean }> {
  const db = await getDB();
  const index = db.transaction('history', 'readonly').store.index('by-date');

  const range = beforeDate ? IDBKeyRange.upperBound(beforeDate, true) : undefined;

  const records: HistoryRecord[] = [];
  let cursor = await index.openCursor(range, 'prev');   // newest first

  while (cursor && records.length < limit + 1) {
    records.push(cursor.value);
    cursor = await cursor.continue();
  }

  const hasMore = records.length > limit;
  return {
    entries: records.slice(0, limit).map(recordToEntry),
    hasMore,
  };
}

export async function getHistoryCount(): Promise<number> {
  const db = await getDB();
  return db.count('history');
}

/**
 * Load all history entries for a specific exercise (by cleanName).
 */
export async function getExerciseHistory(cleanName: string): Promise<HistoryEntry[]> {
  const db = await getDB();
  const all = await db.getAll('history');
  return all
    .filter((r) => r.volumeData.some((ev) => ev.cleanName === cleanName))
    .map(recordToEntry)
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
}

/**
 * Load all history entries (no pagination, for stats).
 */
export async function loadAllHistory(): Promise<HistoryEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('history', 'by-date');
  return all.map(recordToEntry).reverse();  // reverse → newest first
}
