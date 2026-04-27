import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  RoutineData, WorkoutState, WorkoutView,
  HistoryEntry, ExerciseVolume, UserProfile, RoutineSummary,
  UserProfilePatch,
  WorkoutSummary,
} from '@/types/workout';

// ── IDB imports (lazy-safe: only used in async actions) ──────────────────────
import { migrateLegacyData } from '@/lib/db/migrate-legacy';
import {
  saveRoutine, loadRoutine, listRoutines, deleteRoutine,
} from '@/lib/db/routines';
import { loadEarnedAchievementIds, saveAchievement } from '@/lib/db/achievements';
import { saveHistoryEntry, loadHistory } from '@/lib/db/history';
import {
  saveActiveSession, loadActiveSession, clearActiveSession,
} from '@/lib/db/activeSession';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '@/lib/db/profile';
import { clearWorkoutData } from '@/lib/db/index';

function createInitialProfile(): UserProfile {
  return {
    ...DEFAULT_PROFILE,
    preferences: { ...DEFAULT_PROFILE.preferences },
  };
}

function mergeProfilePatch(profile: UserProfile, patch: UserProfilePatch): UserProfile {
  return {
    ...profile,
    ...patch,
    preferences: patch.preferences
      ? { ...profile.preferences, ...patch.preferences }
      : profile.preferences,
    updatedAt: new Date().toISOString(),
  };
}

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
          rpe: s.rpe,
          rir: s.rir,
          setType: s.setType,
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
  profile: createInitialProfile(),
  routineLibrary: [],
  sessionStartTime: null,
  lastWorkoutSummary: null,
  pendingAchievements: [],

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
              rpe: val.rpe,
              rir: val.rir,
              setType: val.setType,
            };
          }
          set({
            currentRoutine: routine,
            activeSessionIdx: activeSession.sessionIdx,
            setCompletion,
            sessionStartTime: new Date(activeSession.startedAt),
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
    const now = new Date();
    set({ currentView: 'active-session', activeSessionIdx: sessionIdx, sessionStartTime: now });

    if (currentRoutine) {
      const session = currentRoutine.sessions[sessionIdx];
      if (session) {
        saveActiveSession(currentRoutine.id, session.id, sessionIdx, {}).catch(console.error);
      }
    }
  },

  toggleSetCompletion: (
    sessionIdx, exerciseId, setIdx,
    repsDone?, weight?, rpe?, rir?, setType?
  ) => {
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
          rpe: rpe ?? current?.rpe,
          rir: rir ?? current?.rir,
          setType: setType ?? current?.setType,
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
    // Haptic feedback on set complete
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  },

  finishSession: async () => {
    const state = get();
    if (!state.currentRoutine || state.activeSessionIdx === null) return;

    const activeSession = state.currentRoutine.sessions[state.activeSessionIdx];
    const volumeData = buildVolumeData(activeSession, state.setCompletion, state.activeSessionIdx);

    const now = new Date();
    const durationSeconds = state.sessionStartTime
      ? Math.round((now.getTime() - state.sessionStartTime.getTime()) / 1000)
      : 0;

    const totalSets = Object.values(state.setCompletion).filter((s) => s.completed).length;

    const newEntry: HistoryEntry = {
      id: uuidv4(),
      sessionIdx: state.activeSessionIdx,
      sessionTitle: activeSession.title,
      completedAt: now,
      completedExercises: volumeData.map((ev) => ev.exerciseId),
      volumeData,
      totalVolume: volumeData.reduce((sum, ev) => sum + ev.totalVolume, 0),
      durationSeconds,
    };

    // ── Sync Zustand update first (history always updated synchronously) ──
    set((s) => ({
      currentView: 'workout-summary',
      history: [newEntry, ...s.history],
      setCompletion: {},
      sessionStartTime: null,
      lastWorkoutSummary: null, // will be populated below
    }));

    // ── Build summary asynchronously (doesn't block history update) ──────
    try {
      const priorHistory = get().history.slice(1); // history without the new entry
      const { buildWorkoutSummary } = await import('@/lib/analytics/session-compare');
      const summary: WorkoutSummary = buildWorkoutSummary(
        newEntry,
        priorHistory,
        totalSets,
        durationSeconds,
      );
      set({ lastWorkoutSummary: summary });

      // ── Evaluate achievements ─────────────────────────────────────────────
      try {
        const { evaluateAchievements } = await import('@/lib/achievements/evaluator');
        const earnedIds = await loadEarnedAchievementIds();
        const newAchievements = evaluateAchievements({
          history: get().history,
          summary,
          earnedIds,
        });
        if (newAchievements.length > 0) {
          await Promise.all(newAchievements.map((a) => saveAchievement(a.id)));
          set({ pendingAchievements: newAchievements.map((a) => a.id) });
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([50, 30, 50, 30, 100]);
          }
        }
      } catch (err) {
        console.error('[useWorkoutStore] achievement evaluation failed', err);
      }
    } catch (err) {
      console.error('[useWorkoutStore] buildWorkoutSummary failed', err);
    }

    // ── IDB writes ────────────────────────────────────────────────────────
    try {
      await saveHistoryEntry(newEntry, state.currentRoutine.id, activeSession.id);
      await clearActiveSession();

      // ── Enqueue cloud sync mutation (fire-and-forget) ──────────────────
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const [{ enqueue }, { historyEntryToRemote }] = await Promise.all([
          import('@/lib/sync/queue'),
          import('@/lib/sync/merge'),
        ]);
        // user_id placeholder — overwritten at push time by syncEngine
        enqueue({ table: 'history', operation: 'upsert', payload: historyEntryToRemote(newEntry, '') })
          .catch((e) => console.error('[useWorkoutStore] enqueue failed', e));
      }
    } catch (err) {
      console.error('[useWorkoutStore] finishSession IDB write failed', err);
    }
  },

  abandonSession: async () => {
    set({
      currentView: 'routine-overview',
      setCompletion: {},
      activeSessionIdx: null,
      sessionStartTime: null,
    });
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
  updateProfile: async (patch: UserProfilePatch) => {
    const nextProfile = mergeProfilePatch(get().profile, patch);
    set({ profile: nextProfile });
    saveProfile(nextProfile).catch(console.error);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { enqueue } = await import('@/lib/sync/queue');
        // Queue the local profile shape; syncEngine converts it to the remote payload.
        enqueue({
          table: 'profile',
          operation: 'upsert',
          payload: nextProfile,
        }).catch((err) => console.error('[useWorkoutStore] enqueue failed', err));
      } catch (err) {
        console.error('[useWorkoutStore] profile sync enqueue failed', err);
      }
    }
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
  clearPendingAchievements: () => set({ pendingAchievements: [] }),

  // ── duplicateRoutine ───────────────────────────────────────────────────────
  duplicateRoutine: async (routineId: string) => {
    const source = await loadRoutine(routineId);
    if (!source) return;
    const { v4: newUuid } = await import('uuid');
    const copy = {
      ...source,
      id: newUuid(),
      title: `${source.title} (Copy)`,
      createdAt: new Date(),
    };
    const summary: RoutineSummary = {
      id: copy.id,
      title: copy.title,
      createdAt: copy.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
      sessionCount: copy.sessions.length,
      exerciseCount: copy.sessions.reduce((s, sess) => s + sess.exercises.length, 0),
    };
    set((state) => ({
      routineLibrary: [summary, ...state.routineLibrary],
    }));
    await saveRoutine(copy, '');
  },

  // ── resetAll ───────────────────────────────────────────────────────────────
  resetAll: async () => {
    set({
      currentRoutine: null,
      currentView: 'uploader',
      activeSessionIdx: null,
      setCompletion: {},
      history: [],
      routineLibrary: [],
      sessionStartTime: null,
      lastWorkoutSummary: null,
    });
    // Clear workout data in background, preserving profile
    clearWorkoutData().catch(console.error);
  },
}));
