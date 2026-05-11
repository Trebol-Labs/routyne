import { getDB } from './index';
import { deserializeRestTimer, serializeRestTimer } from '@/lib/rest-timer';
import type { ActiveSessionRecord } from './schema';
import type { RestTimerState, SetStatus } from '@/types/workout';

const ACTIVE_KEY = 'current' as const;

interface SaveActiveSessionOptions {
  startedAt?: Date;
  restTimer?: RestTimerState | null;
}

export async function saveActiveSession(
  routineId: string,
  sessionId: string,
  sessionIdx: number,
  setCompletion: Record<string, SetStatus>,
  options: SaveActiveSessionOptions = {}
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('activeSession', ACTIVE_KEY);
  const record: ActiveSessionRecord = {
    id: ACTIVE_KEY,
    routineId,
    sessionId,
    sessionIdx,
    startedAt: options.startedAt?.toISOString()
      ?? existing?.startedAt
      ?? new Date().toISOString(),
    setCompletion: Object.fromEntries(
      Object.entries(setCompletion).map(([k, v]) => [
        k,
        {
          completed: v.completed,
          repsDone: v.repsDone,
          weight: v.weight,
          timestamp: v.timestamp instanceof Date ? v.timestamp.toISOString() : v.timestamp,
          rpe: v.rpe,
          rir: v.rir,
          setType: v.setType,
          notes: v.notes,
        },
      ])
    ),
  };

  if (Object.prototype.hasOwnProperty.call(options, 'restTimer')) {
    record.restTimer = serializeRestTimer(options.restTimer);
  } else if (existing?.restTimer) {
    record.restTimer = deserializeRestTimer(existing.restTimer) ? existing.restTimer : null;
  }

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
