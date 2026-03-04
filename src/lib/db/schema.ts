import type { DBSchema } from 'idb';

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
}

export interface SetDetailRecord {
  setIdx: number;
  repsDone: number;
  weight: number | null;
  timestamp: string;    // ISO 8601
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
  completedAt: string;  // ISO 8601
  totalVolume: number;
  volumeData: ExerciseVolumeRecord[];
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
  }>;
}

export interface ProfileRecord {
  id: 'profile';
  displayName: string;
  avatarEmoji: string;
  weightUnit: 'kg' | 'lbs';
  heightCm: number | null;
  defaultRestSeconds: number;
}

export interface MetaRecord {
  key: string;
  value: string;
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
}
