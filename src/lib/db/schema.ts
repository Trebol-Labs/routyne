import type { DBSchema } from 'idb';
import type { SetType } from '@/types/workout';

// ── Record types stored in IndexedDB ────────────────────────────────────────

export interface RoutineRecord {
  id: string;
  title: string;
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
  sourceMarkdown: string;
  sessionCount: number;
  exerciseCount: number;
}

export interface SessionRecord {
  id: string;
  routineId: string;
  title: string;
  sortOrder: number;
}

export interface ExerciseRecord {
  id: string;
  sessionId: string;
  routineId: string;
  originalName: string;
  cleanName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  mediaUrl: string | null;
  notes: string | null;
  sortOrder: number;
  setType?: SetType;       // ← NEW
  supersetId?: string;     // ← NEW
}

export interface SetDetailRecord {
  setIdx: number;
  repsDone: number;
  weight: number | null;
  timestamp: string;    // ISO 8601
  rpe?: number;         // ← NEW: 1–10
  rir?: number;         // ← NEW: 0–5
  setType?: SetType;    // ← NEW
}

export interface ExerciseVolumeRecord {
  exerciseId: string;
  cleanName: string;
  setsCompleted: number;
  totalReps: number;
  totalVolume: number;
  setDetails: SetDetailRecord[];
}

export interface HistoryRecord {
  id: string;
  routineId: string;
  sessionId: string;
  sessionIdx?: number;
  sessionTitle: string;
  completedAt: string;      // ISO 8601
  totalVolume: number;
  volumeData: ExerciseVolumeRecord[];
  durationSeconds?: number; // ← NEW
  notes?: string;           // ← NEW
}

export interface ActiveSessionRecord {
  id: 'current';
  routineId: string;
  sessionId: string;
  sessionIdx: number;
  startedAt: string;    // ISO 8601
  setCompletion: Record<string, {
    completed: boolean;
    repsDone?: number;
    weight?: number;
    timestamp?: string;
    rpe?: number;       // ← NEW
    rir?: number;       // ← NEW
    setType?: SetType;  // ← NEW
  }>;
}

export interface ProfileRecord {
  id: 'profile';
  displayName: string;
  avatarEmoji: string;
  weightUnit: 'kg' | 'lbs';
  heightCm: number | null;
  defaultRestSeconds: number;
  restDays?: number[];   // optional for backward compat
}

export interface MetaRecord {
  key: string;
  value: string;
}

export interface AchievementRecord {
  id: string;      // achievement definition ID
  earnedAt: string; // ISO 8601
}

export interface BodyweightRecord {
  id: string;       // uuidv4
  date: string;     // YYYY-MM-DD
  weight: number;
  unit: 'kg' | 'lbs';
}

// ── DBSchema for idb ─────────────────────────────────────────────────────────

export interface RoutineDB extends DBSchema {
  routines: {
    key: string;
    value: RoutineRecord;
    indexes: { 'by-updated': string; 'by-title': string };
  };
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { 'by-routine': string };
  };
  exercises: {
    key: string;
    value: ExerciseRecord;
    indexes: { 'by-session': string; 'by-routine': string; 'by-name': string };
  };
  history: {
    key: string;
    value: HistoryRecord;
    indexes: { 'by-date': string; 'by-routine': string; 'by-session': string };
  };
  activeSession: {
    key: string;
    value: ActiveSessionRecord;
  };
  profile: {
    key: string;
    value: ProfileRecord;
  };
  meta: {
    key: string;
    value: MetaRecord;
  };
  bodyweight: {
    key: string;
    value: BodyweightRecord;
    indexes: { 'by-date': string };
  };
  achievements: {
    key: string;
    value: AchievementRecord;
  };
}
