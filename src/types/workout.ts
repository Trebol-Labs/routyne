// ── Set type classification ───────────────────────────────────────────────────

export type SetType = 'warmup' | 'working' | 'dropset' | 'amrap' | 'failure';

// ── Core exercise / routine types ─────────────────────────────────────────────

export interface ParsedExercise {
  id: string;
  originalName: string;
  cleanName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  mediaUrl: string | null;
  notes?: string;
  setType?: SetType;          // per-exercise default set type
  supersetId?: string;        // group ID for superset pairing
}

export interface WorkoutSession {
  id: string;
  title: string;
  exercises: ParsedExercise[];
}

export interface RoutineData {
  id: string;
  title: string;
  sessions: WorkoutSession[];
  createdAt: Date;
}

export interface RoutineSummary {
  id: string;
  title: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  sessionCount: number;
  exerciseCount: number;
}

// ── Set completion tracking ───────────────────────────────────────────────────

export interface SetStatus {
  completed: boolean;
  repsDone?: number;
  weight?: number;
  timestamp?: Date;
  rpe?: number;           // 1–10 Rating of Perceived Exertion
  rir?: number;           // 0–5 Reps in Reserve
  setType?: SetType;      // override per completed set
  notes?: string;
}

export type WorkoutView =
  | 'uploader'
  | 'routine-overview'
  | 'active-session'
  | 'workout-summary'   // ← NEW: post-workout summary screen
  | 'history'
  | 'stats'
  | 'routine-builder';  // ← NEW: visual routine editor

// ── User profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string;
  avatarEmoji: string;
  weightUnit: 'kg' | 'lbs';
  heightCm: number | null;
  defaultRestSeconds: number;
  restDays: number[];   // JS day-of-week: 0=Sun, 1=Mon … 6=Sat
}

// ── Exercise browse (ExerciseDB) ──────────────────────────────────────────────

export interface ExerciseBrowseItem {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl?: string;
}

// ── History / volume tracking ─────────────────────────────────────────────────

export interface SetDetail {
  setIdx: number;
  repsDone: number;
  weight: number | null;
  timestamp: Date | null;
  rpe?: number;
  rir?: number;
  setType?: SetType;
}

export interface ExerciseVolume {
  exerciseId: string;
  cleanName: string;
  setsCompleted: number;
  totalReps: number;
  totalVolume: number;
  setDetails?: SetDetail[];
}

export interface HistoryEntry {
  id: string;
  sessionIdx: number;
  sessionTitle: string;
  completedAt: Date;
  completedExercises: string[];
  volumeData: ExerciseVolume[];
  totalVolume: number;
  durationSeconds?: number;   // ← NEW
  notes?: string;             // ← NEW
}

// ── Workout summary (shown after finishSession) ───────────────────────────────

export interface SetDelta {
  exerciseName: string;
  setIdx: number;
  weightDelta: number;        // kg/lbs diff vs last session
  repsDelta: number;
  isNewPR: boolean;
}

export interface WorkoutSummary {
  entry: HistoryEntry;
  durationSeconds: number;
  totalSets: number;
  newPRs: SetDelta[];
  volumeDeltaPercent: number | null;  // null if no previous session
  previousEntry: HistoryEntry | null;
}

// ── Progression engine types ──────────────────────────────────────────────────

export type ProgressionModel = 'linear' | 'double' | 'rpe';

export interface ProgressionSuggestion {
  suggestedWeight: number | null;
  suggestedReps: number;
  model: ProgressionModel;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// ── Analytics types ───────────────────────────────────────────────────────────

export interface ExerciseProgressPoint {
  date: Date;
  maxWeight: number;
  totalVolume: number;
  estimatedOneRM: number;
  avgRpe?: number;
}

export interface ExerciseProgressData {
  cleanName: string;
  points: ExerciseProgressPoint[];
  allTimePR: { weight: number; reps: number; date: Date } | null;
  recentTrend: 'up' | 'down' | 'flat';
}

// ── Body weight ───────────────────────────────────────────────────────────────

export interface Bodyweight {
  id: string;
  date: string;     // YYYY-MM-DD
  weight: number;
  unit: 'kg' | 'lbs';
}

// ── Store state interface ─────────────────────────────────────────────────────

export interface WorkoutState {
  // UI state (Zustand-only, NOT persisted to IDB)
  currentView: WorkoutView;
  isLoading: boolean;
  isHydrated: boolean;

  // Data state (cached from IDB)
  currentRoutine: RoutineData | null;
  activeSessionIdx: number | null;
  setCompletion: Record<string, SetStatus>;
  history: HistoryEntry[];
  historyHasMore: boolean;
  profile: UserProfile;
  routineLibrary: RoutineSummary[];

  // Session timing
  sessionStartTime: Date | null;             // ← NEW

  // Post-workout summary (populated by finishSession)
  lastWorkoutSummary: WorkoutSummary | null; // ← NEW

  // ── Async actions ─────────────────────────────────────────────────────────
  hydrate: () => Promise<void>;
  importRoutine: (routine: RoutineData, sourceMarkdown: string) => Promise<void>;
  loadRoutineFromLibrary: (routineId: string) => Promise<void>;
  deleteRoutineFromLibrary: (routineId: string) => Promise<void>;
  startSession: (sessionIdx: number) => Promise<void>;
  finishSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  resetAll: () => Promise<void>;
  updateActiveSessionExercises: (exercises: ParsedExercise[]) => Promise<void>;

  // ── Sync actions ──────────────────────────────────────────────────────────
  toggleSetCompletion: (
    sessionIdx: number,
    exerciseId: string,
    setIdx: number,
    repsDone?: number,
    weight?: number,
    rpe?: number,
    rir?: number,
    setType?: SetType,
  ) => void;

  setCurrentView: (view: WorkoutView) => void;
  setIsLoading: (loading: boolean) => void;
  resetProgress: () => void;

  /** Backward-compat alias for importRoutine (sourceMarkdown='', used in tests). */
  setCurrentRoutine: (routine: RoutineData) => void;
}
