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

export interface SetStatus {
  completed: boolean;
  repsDone?: number;
  weight?: number;
  timestamp?: Date;
}

export type WorkoutView = 'uploader' | 'routine-overview' | 'active-session' | 'history' | 'stats';

export interface UserProfile {
  displayName: string;
  avatarEmoji: string;
  weightUnit: 'kg' | 'lbs';
  heightCm: number | null;
  defaultRestSeconds: number;
}

export interface ExerciseBrowseItem {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl?: string;
}

export interface ExerciseVolume {
  exerciseId: string;
  cleanName: string;
  setsCompleted: number;
  totalReps: number;
  totalVolume: number;
}

export interface HistoryEntry {
  id: string;
  sessionIdx: number;
  sessionTitle: string;
  completedAt: Date;
  completedExercises: string[];
  volumeData: ExerciseVolume[];
  totalVolume: number;
}

// ── Store state interface ────────────────────────────────────────────────────

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

  // ── Async actions (update Zustand synchronously, write IDB in background) ──
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

  // ── Sync actions ─────────────────────────────────────────────────────────
  /** Sync Zustand update + fire-and-forget IDB write. */
  toggleSetCompletion: (
    sessionIdx: number,
    exerciseId: string,
    setIdx: number,
    repsDone?: number,
    weight?: number
  ) => void;

  setCurrentView: (view: WorkoutView) => void;
  setIsLoading: (loading: boolean) => void;
  resetProgress: () => void;

  /** Backward-compat alias for importRoutine (sourceMarkdown='', used in tests). */
  setCurrentRoutine: (routine: RoutineData) => void;
}
