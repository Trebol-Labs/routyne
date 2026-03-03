import { getDB } from './index';
import type { RoutineRecord } from './schema';
import type { RoutineData, RoutineSummary } from '@/types/workout';

// ── Converters ────────────────────────────────────────────────────────────────

function routineToRecord(routine: RoutineData, sourceMarkdown: string): RoutineRecord {
  const now = new Date().toISOString();
  return {
    id: routine.id,
    title: routine.title,
    createdAt: routine.createdAt instanceof Date
      ? routine.createdAt.toISOString()
      : String(routine.createdAt),
    updatedAt: now,
    sourceMarkdown,
    sessionCount: routine.sessions.length,
    exerciseCount: routine.sessions.reduce((sum, s) => sum + s.exercises.length, 0),
  };
}

function recordToSummary(r: RoutineRecord): RoutineSummary {
  return {
    id: r.id,
    title: r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    sessionCount: r.sessionCount,
    exerciseCount: r.exerciseCount,
  };
}

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * Save a full RoutineData into IDB (routines + sessions + exercises).
 * Atomic: uses a single transaction.
 */
export async function saveRoutine(routine: RoutineData, sourceMarkdown: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['routines', 'sessions', 'exercises'], 'readwrite');
  const routineStore = tx.objectStore('routines');
  const sessionStore = tx.objectStore('sessions');
  const exerciseStore = tx.objectStore('exercises');

  // Upsert routine record
  await routineStore.put(routineToRecord(routine, sourceMarkdown));

  // Delete existing sessions + exercises for this routine to avoid stale data
  {
    const idx = sessionStore.index('by-routine');
    let cursor = await idx.openCursor(IDBKeyRange.only(routine.id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  {
    const idx = exerciseStore.index('by-routine');
    let cursor = await idx.openCursor(IDBKeyRange.only(routine.id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }

  // Insert sessions and exercises
  for (let si = 0; si < routine.sessions.length; si++) {
    const session = routine.sessions[si];
    await sessionStore.put({ id: session.id, routineId: routine.id, title: session.title, sortOrder: si });
    for (let ei = 0; ei < session.exercises.length; ei++) {
      const ex = session.exercises[ei];
      await exerciseStore.put({
        id: ex.id,
        sessionId: session.id,
        routineId: routine.id,
        originalName: ex.originalName,
        cleanName: ex.cleanName,
        sets: ex.sets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        restSeconds: ex.restSeconds,
        mediaUrl: ex.mediaUrl,
        notes: ex.notes ?? null,
        sortOrder: ei,
      });
    }
  }

  await tx.done;
}

/**
 * Reconstruct a full RoutineData from IDB.
 */
export async function loadRoutine(routineId: string): Promise<RoutineData | null> {
  const db = await getDB();
  const record = await db.get('routines', routineId);
  if (!record) return null;

  const sessionRecords = await db.getAllFromIndex('sessions', 'by-routine', routineId);
  sessionRecords.sort((a, b) => a.sortOrder - b.sortOrder);

  const sessions = await Promise.all(
    sessionRecords.map(async (s) => {
      const exerciseRecords = await db.getAllFromIndex('exercises', 'by-session', s.id);
      exerciseRecords.sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        id: s.id,
        title: s.title,
        exercises: exerciseRecords.map((ex) => ({
          id: ex.id,
          originalName: ex.originalName,
          cleanName: ex.cleanName,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
          restSeconds: ex.restSeconds,
          mediaUrl: ex.mediaUrl,
          notes: ex.notes ?? undefined,
        })),
      };
    })
  );

  return {
    id: record.id,
    title: record.title,
    sessions,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * List all saved routines as summaries, sorted newest first.
 */
export async function listRoutines(): Promise<RoutineSummary[]> {
  const db = await getDB();
  const all = await db.getAll('routines');
  return all
    .map(recordToSummary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Delete a routine and all its sessions and exercises.
 */
export async function deleteRoutine(routineId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['routines', 'sessions', 'exercises'], 'readwrite');

  await tx.objectStore('routines').delete(routineId);

  const sessionIdx = tx.objectStore('sessions').index('by-routine');
  let sessionCursor = await sessionIdx.openCursor(IDBKeyRange.only(routineId));
  while (sessionCursor) {
    await sessionCursor.delete();
    sessionCursor = await sessionCursor.continue();
  }

  const exerciseIdx = tx.objectStore('exercises').index('by-routine');
  let exerciseCursor = await exerciseIdx.openCursor(IDBKeyRange.only(routineId));
  while (exerciseCursor) {
    await exerciseCursor.delete();
    exerciseCursor = await exerciseCursor.continue();
  }

  await tx.done;
}
