/**
 * One-time migration: localStorage (routyne-storage) → IndexedDB.
 * Idempotent: checks meta store for 'legacy-migrated' flag before running.
 */
import { getDB } from './index';
import { saveRoutine } from './routines';
import { saveHistoryEntry } from './history';
import { DEFAULT_PROFILE, saveProfile } from './profile';
import type { HistoryEntry, RoutineData, UserProfile } from '@/types/workout';

const MIGRATION_KEY = 'legacy-migrated';
const LS_KEY = 'routyne-storage';

interface LegacyStorage {
  state?: {
    history?: Array<{
      id: string;
      sessionIdx?: number;
      sessionTitle: string;
      completedAt: string | Date;
      completedExercises?: string[];
      volumeData?: Array<{
        exerciseId: string;
        cleanName: string;
        setsCompleted: number;
        totalReps: number;
        totalVolume: number;
      }>;
      totalVolume: number;
    }>;
    currentRoutine?: {
      id: string;
      title: string;
      createdAt: string | Date;
      sessions: Array<{
        id: string;
        title: string;
        exercises: Array<{
          id: string;
          originalName: string;
          cleanName: string;
          sets: number;
          repsMin: number;
          repsMax: number;
          restSeconds: number;
          mediaUrl: string | null;
          notes?: string;
        }>;
      }>;
    };
    profile?: UserProfile;
  };
}

function normalizeLegacyProfile(profile: Partial<UserProfile>): UserProfile {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    preferences: {
      ...DEFAULT_PROFILE.preferences,
      ...(profile.preferences ?? {}),
    },
    restDays: profile.restDays ?? DEFAULT_PROFILE.restDays,
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
  };
}

export async function migrateLegacyData(): Promise<void> {
  if (typeof window === 'undefined') return;

  const db = await getDB();

  // Check migration flag
  const flag = await db.get('meta', MIGRATION_KEY);
  if (flag) return;  // already done

  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    // No legacy data — just mark as done
    await db.put('meta', { key: MIGRATION_KEY, value: 'no-data' });
    return;
  }

  let legacy: LegacyStorage;
  try {
    legacy = JSON.parse(raw) as LegacyStorage;
  } catch {
    await db.put('meta', { key: MIGRATION_KEY, value: 'parse-error' });
    return;
  }

  const state = legacy.state ?? {};

  // Migrate profile
  if (state.profile) {
    try {
      await saveProfile(normalizeLegacyProfile(state.profile as Partial<UserProfile>));
    } catch { /* non-critical */ }
  }

  // Migrate current routine
  let migratedRoutineId: string | undefined;
  if (state.currentRoutine) {
    try {
      const routine: RoutineData = {
        id: state.currentRoutine.id,
        title: state.currentRoutine.title,
        createdAt: new Date(state.currentRoutine.createdAt),
        sessions: state.currentRoutine.sessions.map((s) => ({
          id: s.id,
          title: s.title,
          exercises: s.exercises.map((ex) => ({
            id: ex.id,
            originalName: ex.originalName,
            cleanName: ex.cleanName,
            sets: ex.sets,
            repsMin: ex.repsMin,
            repsMax: ex.repsMax,
            restSeconds: ex.restSeconds ?? 90,
            mediaUrl: ex.mediaUrl,
            notes: ex.notes,
          })),
        })),
      };
      await saveRoutine(routine, '');  // sourceMarkdown unknown for legacy
      migratedRoutineId = routine.id;
    } catch { /* non-critical */ }
  }

  // Migrate history
  if (state.history?.length) {
    for (const raw of state.history) {
      try {
        const entry: HistoryEntry = {
          id: raw.id,
          sessionIdx: raw.sessionIdx ?? 0,
          sessionTitle: raw.sessionTitle,
          completedAt: new Date(raw.completedAt),
          completedExercises: raw.completedExercises ?? [],
          volumeData: (raw.volumeData ?? []).map((ev) => ({
            exerciseId: ev.exerciseId,
            cleanName: ev.cleanName,
            setsCompleted: ev.setsCompleted,
            totalReps: ev.totalReps,
            totalVolume: ev.totalVolume,
          })),
          totalVolume: raw.totalVolume,
        };
        await saveHistoryEntry(entry, migratedRoutineId ?? 'unknown', 'unknown');
      } catch { /* skip bad entries */ }
    }
  }

  // Mark complete + free localStorage
  await db.put('meta', { key: MIGRATION_KEY, value: new Date().toISOString() });
  localStorage.removeItem(LS_KEY);
}
