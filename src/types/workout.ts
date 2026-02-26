export interface ParsedExercise {
  id: string;
  originalName: string;
  cleanName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number; // Added for the timer system
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

export interface SetStatus {
  completed: boolean;
  repsDone?: number;
  weight?: number;
  timestamp?: Date;
}

export type WorkoutView = 'uploader' | 'routine-overview' | 'active-session' | 'history' | 'stats';

export interface ExerciseVolume {
  exerciseId: string;
  cleanName: string;
  setsCompleted: number;
  totalReps: number;
  totalVolume: number; // reps × weight (0 for bodyweight)
}

export interface HistoryEntry {
  id: string;
  sessionIdx: number;
  sessionTitle: string;
  completedAt: Date;
  completedExercises: string[];   // kept for backward compat
  volumeData: ExerciseVolume[];   // per-exercise volume breakdown
  totalVolume: number;            // session aggregate
}

// Store state interface
export interface WorkoutState {
  currentRoutine: RoutineData | null;
  currentView: WorkoutView;
  activeSessionIdx: number | null;
  isLoading: boolean;
  
  // Progress tracking: key is "sessionIdx-exerciseId-setIdx"
  setCompletion: Record<string, SetStatus>;
  
  history: HistoryEntry[];
  
  // Actions
  setCurrentRoutine: (routine: RoutineData) => void;
  setCurrentView: (view: WorkoutView) => void;
  setIsLoading: (isLoading: boolean) => void;
  startSession: (sessionIdx: number) => void;
  toggleSetCompletion: (
    sessionIdx: number,
    exerciseId: string,
    setIdx: number,
    repsDone?: number,
    weight?: number
  ) => void;
  finishSession: () => void;
  resetProgress: () => void;
  resetAll: () => void;
}
