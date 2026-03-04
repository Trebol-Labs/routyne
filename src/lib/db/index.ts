import { openDB, IDBPDatabase } from 'idb';
import type { RoutineDB } from './schema';

const DB_NAME = 'routyne-db';
const DB_VERSION = 1;

let _db: IDBPDatabase<RoutineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<RoutineDB>> {
  if (_db) return _db;

  _db = await openDB<RoutineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // routines
      const routinesStore = db.createObjectStore('routines', { keyPath: 'id' });
      routinesStore.createIndex('by-updated', 'updatedAt');
      routinesStore.createIndex('by-title', 'title');

      // sessions
      const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
      sessionsStore.createIndex('by-routine', 'routineId');

      // exercises
      const exercisesStore = db.createObjectStore('exercises', { keyPath: 'id' });
      exercisesStore.createIndex('by-session', 'sessionId');
      exercisesStore.createIndex('by-routine', 'routineId');
      exercisesStore.createIndex('by-name', 'cleanName');

      // history
      const historyStore = db.createObjectStore('history', { keyPath: 'id' });
      historyStore.createIndex('by-date', 'completedAt');
      historyStore.createIndex('by-routine', 'routineId');
      historyStore.createIndex('by-session', 'sessionId');

      // activeSession (singleton — key is always 'current')
      db.createObjectStore('activeSession', { keyPath: 'id' });

      // profile (singleton — key is always 'profile')
      db.createObjectStore('profile', { keyPath: 'id' });

      // meta flags
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });

  return _db;
}

/** Close connection and clear the cached singleton (needed between tests). */
export function resetDBSingleton(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** Close, then delete the entire database (used in resetAll and tests). */
export async function deleteDatabase(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
  const { deleteDB } = await import('idb');
  await deleteDB(DB_NAME);
}

/**
 * Clear all workout data stores except profile.
 * Used by resetAll() to preserve user identity.
 */
export async function clearWorkoutData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['routines', 'sessions', 'exercises', 'history', 'activeSession'],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('routines').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('exercises').clear(),
    tx.objectStore('history').clear(),
    tx.objectStore('activeSession').clear(),
  ]);
  await tx.done;
}
