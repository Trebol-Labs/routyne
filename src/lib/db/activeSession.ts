import { getDB } from './index';
import type { ActiveSessionRecord } from './schema';
import type { SetStatus } from '@/types/workout';

const ACTIVE_KEY = 'current' as const;

export async function saveActiveSession(
  routineId: string,
  sessionId: string,
  sessionIdx: number,
  setCompletion: Record<string, SetStatus>
): Promise<void> {
  const db = await getDB();
  const record: ActiveSessionRecord = {
    id: ACTIVE_KEY,
    routineId,
    sessionId,
    sessionIdx,
    startedAt: new Date().toISOString(),
    setCompletion: Object.fromEntries(
      Object.entries(setCompletion).map(([k, v]) => [
        k,
        {
          completed: v.completed,
          repsDone: v.repsDone,
          weight: v.weight,
          timestamp: v.timestamp instanceof Date ? v.timestamp.toISOString() : v.timestamp,
        },
      ])
    ),
  };
  await db.put('activeSession', record);
}

export async function loadActiveSession(): Promise<ActiveSessionRecord | null> {
  const db = await getDB();
  return (await db.get('activeSession', ACTIVE_KEY)) ?? null;
}

export async function clearActiveSession(): Promise<void> {
  const db = await getDB();
  await db.delete('activeSession', ACTIVE_KEY);
}
