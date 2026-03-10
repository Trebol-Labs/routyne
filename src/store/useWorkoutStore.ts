import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  RoutineData, WorkoutState, WorkoutView,
  HistoryEntry, ExerciseVolume, UserProfile, RoutineSummary,
} from '@/types/workout';

// ── IDB imports (lazy-safe: only used in async actions) ──────────────────────
import { migrateLegacyData } from '@/lib/db/migrate-legacy';
import {
  saveRoutine, loadRoutine, listRoutines, deleteRoutine,
} from '@/lib/db/routines';
import { saveHistoryEntry, loadHistory } from '@/lib/db/history';
import {
  saveActiveSession, loadActiveSession, clearActiveSession,
} from '@/lib/db/activeSession';
import { loadProfile, saveProfile } from '@/lib/db/profile';
import { clearWorkoutData } from '@/lib/db/index';

// ── Default profile ──────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Athlete',
  avatarEmoji: '💪',
  weightUnit: 'kg',
  heightCm: null,
  defaultRestSeconds: 90,
  restDays: [],
};

// ── Volume helper ─────────────────────────────────────────────────────────────

function buildVolumeData(
  session: RoutineData['sessions'][number],
  setCompletion: WorkoutState['setCompletion'],
  sessionIdx: number
): ExerciseVolume[] {
  return session.exercises
    .map((ex) => {
      const completedSets = Object.entries(setCompletion).filter(
        ([key, status]) =>
          key.startsWith(`${sessionIdx}-${ex.id}-`) && status.completed
      );
      const totalReps = completedSets.reduce((sum, [, s]) => sum + (s.repsDone ?? 0), 0);
      const totalVolume = completedSets.reduce(
        (sum, [, s]) => sum + (s.repsDone ?? 0) * (s.weight ?? 0),
        0
      );
      return {
        exerciseId: ex.id,
        cleanName: ex.cleanName,
        setsCompleted: completedSets.length,
        totalReps,
        totalVolume,
        setDetails: completedSets.map(([key, s]) => ({
          setIdx: parseInt(key.split('-').at(-1) ?? '0', 10),
          repsDone: s.repsDone ?? 0,
          weight: s.weight ?? null,
          timestamp: s.timestamp ?? null,
        })),
      };
    })
    .filter((ev) => ev.setsCompleted > 0);
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutState>()((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  currentView: 'uploader',
  isLoading: false,
  isHydrated: false,
  currentRoutine: null,
  activeSessionIdx: null,
  setCompletion: {},
  history: [],
  historyHasMore: false,
  profile: { ...DEFAULT_PROFILE },
  routineLibrary: [],

  // ── hydrate ────────────────────────────────────────────────────────────────
  hydrate: async () => {
    try {
      await migrateLegacyData();

      const [profile, library, historyResult, activeSession] = await Promise.all([
        loadProfile(),
        listRoutines(),
        loadHistory(50),
        loadActiveSession(),
      ]);

      // Base state update
      set({
        profile,
        routineLibrary: library,
        history: historyResult.entries,
        historyHasMore: historyResult.hasMore,
        isHydrated: true,
      });

      // Restore in-progress session if one exists
      if (activeSession) {
        const routine = await loadRoutine(activeSession.routineId);
        if (routine) {
          const setCompletion: WorkoutState['setCompletion'] = {};
          for (const [key, val] of Object.entries(activeSession.setCompletion)) {
            setCompletion[key] = {
              completed: val.completed,
              repsDone: val.repsDone,
              weight: val.weight,
              timestamp: val.timestamp ? new Date(val.timestamp) : undefined,
            };
          }
          set({
            currentRoutine: routine,
            activeSessionIdx: activeSession.sessionIdx,
            setCompletion,
            currentView: 'active-session',
          });
          return;
        }
      }

      // No active session — decide initial view
      if (library.length > 0) {
        // Load most-recently-used routine
        const routine = await loadRoutine(library[0].id);
        if (routine) {
          set({ currentRoutine: routine, currentView: 'routine-overview' });
        }
      }
    } catch (err) {
      console.error('[useWorkoutStore] hydrate failed', err);
      set({ isHydrated: true });
    }
  },

  // ── importRoutine ──────────────────────────────────────────────────────────
  importRoutine: async (routine: RoutineData, sourceMarkdown: string) => {
    const summary: RoutineSummary = {
      id: routine.id,
      title: routine.title,
      createdAt: routine.createdAt instanceof Date
        ? routine.createdAt.toISOString()
        : String(routine.createdAt),
      updatedAt: new Date().toISOString(),
      sessionCount: routine.sessions.length,
      exerciseCount: routine.sessions.reduce((s, sess) => s + sess.exercises.length, 0),
    };

    // Sync Zustand update first (instant UI)
    set((state) => ({
      currentRoutine: routine,
      currentView: 'routine-overview',
      activeSessionIdx: 0,
      setCompletion: {},
      routineLibrary: [
        summary,
        ...state.routineLibrary.filter((r) => r.id !== routine.id),
      ],
    }));

    // Ensure IDB write completes before import is considered done
    try {
      await saveRoutine(routine, sourceMarkdown);
    } catch (err) {
      console.error('[useWorkoutStore] importRoutine IDB write failed', err);
      throw err;
    }
  },

  // backward-compat sync alias used by tests
  setCurrentRoutine: (routine: RoutineData) => {
    get().importRoutine(routine, '');
  },

  // ── Routine library ────────────────────────────────────────────────────────
  loadRoutineFromLibrary: async (routineId: string) => {
    const routine = await loadRoutine(routineId);
    if (!routine) return;
    set({
      currentRoutine: routine,
      currentView: 'routine-overview',
      activeSessionIdx: 0,
      setCompletion: {},
    });
  },

  deleteRoutineFromLibrary: async (routineId: string) => {
    set((state) => ({
      routineLibrary: state.routineLibrary.filter((r) => r.id !== routineId),
      ...(state.currentRoutine?.id === routineId
        ? { currentRoutine: null, currentView: 'uploader' as WorkoutView }
        : {}),
    }));
    deleteRoutine(routineId).catch(console.error);
  },

  // ── Session lifecycle ──────────────────────────────────────────────────────
  startSession: async (sessionIdx: number) => {
    const { currentRoutine } = get();
    set({ currentView: 'active-session', activeSessionIdx: sessionIdx });

    if (currentRoutine) {
      const session = currentRoutine.sessions[sessionIdx];
      if (session) {
        saveActiveSession(currentRoutine.id, session.id, sessionIdx, {}).catch(console.error);
      }
    }
  },

  toggleSetCompletion: (sessionIdx, exerciseId, setIdx, repsDone?, weight?) => {
    set((state) => {
      const key = `${sessionIdx}-${exerciseId}-${setIdx}`;
      const current = state.setCompletion[key];
      const next = {
        ...state.setCompletion,
        [key]: {
          completed: !current?.completed,
          repsDone: repsDone ?? current?.repsDone,
          weight: weight ?? current?.weight,
          timestamp: new Date(),
        },
      };

      // Fire-and-forget IDB write
      const { currentRoutine, activeSessionIdx } = state;
      if (currentRoutine && activeSessionIdx !== null) {
        const session = currentRoutine.sessions[activeSessionIdx];
        if (session) {
          saveActiveSession(
            currentRoutine.id,
            session.id,
            activeSessionIdx,
            next
          ).catch(console.error);
        }
      }

      return { setCompletion: next };
    });
  },

  finishSession: async () => {
    const state = get();
    if (!state.currentRoutine || state.activeSessionIdx === null) return;

    const activeSession = state.currentRoutine.sessions[state.activeSessionIdx];
    const volumeData = buildVolumeData(activeSession, state.setCompletion, state.activeSessionIdx);

    const newEntry: HistoryEntry = {
      id: uuidv4(),
      sessionIdx: state.activeSessionIdx,
      sessionTitle: activeSession.title,
      completedAt: new Date(),
      completedExercises: volumeData.map((ev) => ev.exerciseId),
      volumeData,
      totalVolume: volumeData.reduce((sum, ev) => sum + ev.totalVolume, 0),
    };

    // Sync Zustand update
    set((s) => ({
      currentView: 'history',
      history: [newEntry, ...s.history],
      setCompletion: {},
    }));

    // IDB writes
    try {
      await saveHistoryEntry(newEntry, state.currentRoutine.id, activeSession.id);
      await clearActiveSession();
    } catch (err) {
      console.error('[useWorkoutStore] finishSession IDB write failed', err);
    }
  },

  abandonSession: async () => {
    set({ currentView: 'routine-overview', setCompletion: {}, activeSessionIdx: null });
    clearActiveSession().catch(console.error);
  },

  // ── History ────────────────────────────────────────────────────────────────
  loadMoreHistory: async () => {
    const { history } = get();
    const oldest = history[history.length - 1];
    const beforeDate = oldest?.completedAt instanceof Date
      ? oldest.completedAt.toISOString()
      : undefined;

    const { loadHistory } = await import('@/lib/db/history');
    const { entries, hasMore } = await loadHistory(50, beforeDate);
    set((s) => ({
      history: [...s.history, ...entries],
      historyHasMore: hasMore,
    }));
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  updateProfile: async (patch: Partial<UserProfile>) => {
    set((s) => ({ profile: { ...s.profile, ...patch } }));
    saveProfile(get().profile).catch(console.error);
  },

  // ── Active Session ─────────────────────────────────────────────────────────
  updateActiveSessionExercises: async (exercises) => {
    const { currentRoutine, activeSessionIdx } = get();
    if (!currentRoutine || activeSessionIdx === null) return;

    const updatedRoutine = {
      ...currentRoutine,
      sessions: currentRoutine.sessions.map((s, i) =>
        i === activeSessionIdx ? { ...s, exercises } : s
      ),
    };

    set({ currentRoutine: updatedRoutine });
    saveRoutine(updatedRoutine).catch(console.error);
  },

  // ── Misc sync ──────────────────────────────────────────────────────────────
  setCurrentView: (view: WorkoutView) => set({ currentView: view }),
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  resetProgress: () => set({ setCompletion: {} }),

  // ── resetAll ───────────────────────────────────────────────────────────────
  resetAll: async () => {
    set({
      currentRoutine: null,
      currentView: 'uploader',
      activeSessionIdx: null,
      setCompletion: {},
      history: [],
      routineLibrary: [],
    });
    // Clear workout data in background, preserving profile
    clearWorkoutData().catch(console.error);
  },
}));
