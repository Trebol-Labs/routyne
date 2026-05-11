import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  RoutineData, WorkoutState, WorkoutView,
  HistoryEntry, ExerciseVolume, UserProfile, RoutineSummary,
  UserProfilePatch,
  WorkoutSummary,
  NutritionEntry,
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
import type { ActiveSessionRecord } from '@/lib/db/schema';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '@/lib/db/profile';
import {
  DEFAULT_NUTRITION_GOAL,
  deleteNutritionEntry as deleteNutritionEntryRecord,
  loadNutritionEntriesByDate,
  loadNutritionEntry,
  loadNutritionGoal,
  saveNutritionEntry as saveNutritionEntryRecord,
  saveNutritionGoal,
} from '@/lib/db/nutrition';
import { clearWorkoutData } from '@/lib/db/index';
import { clearLocalDataMarker, syncLocalDataMarker } from '@/lib/local-data-marker';
import {
  deserializeRestTimer,
  normalizeRestTimerState,
  syncRestTimerNotification,
} from '@/lib/rest-timer';
import type { RestTimerState } from '@/types/workout';

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

async function reconcileAchievementsSilently(source: string): Promise<void> {
  try {
    const { reconcileAchievementsFromHistory } = await import('@/lib/achievements/reconcile');
    await reconcileAchievementsFromHistory();
  } catch (err) {
    console.error(`[useWorkoutStore] ${source} achievement reconciliation failed`, err);
  }
}

const REST_TIMER_AUTO_CLEAR_DELAY_MS = 5000;
let restTimerAutoClearTimeout: ReturnType<typeof setTimeout> | null = null;

function hasLocalData(state: Pick<WorkoutState, 'currentRoutine' | 'activeSessionIdx' | 'history' | 'routineLibrary' | 'restTimer'>): boolean {
  return Boolean(
    state.currentRoutine ||
    state.activeSessionIdx !== null ||
    state.restTimer ||
    state.history.length > 0 ||
    state.routineLibrary.length > 0
  );
}

function syncLocalDataMarkerFromState(state: Pick<WorkoutState, 'currentRoutine' | 'activeSessionIdx' | 'history' | 'routineLibrary' | 'restTimer'>): void {
  syncLocalDataMarker(hasLocalData(state));
}

function clearRestTimerAutoClearTimeout(): void {
  if (restTimerAutoClearTimeout) {
    clearTimeout(restTimerAutoClearTimeout);
    restTimerAutoClearTimeout = null;
  }
}

function scheduleRestTimerAutoClear(clearTimer: () => Promise<void>): void {
  clearRestTimerAutoClearTimeout();
  restTimerAutoClearTimeout = setTimeout(() => {
    void clearTimer().catch((err) => {
      console.error('[useWorkoutStore] rest timer auto-clear failed', err);
    });
  }, REST_TIMER_AUTO_CLEAR_DELAY_MS);
}

function deserializeSetCompletion(
  setCompletion: ActiveSessionRecord['setCompletion']
): WorkoutState['setCompletion'] {
  const next: WorkoutState['setCompletion'] = {};
  for (const [key, val] of Object.entries(setCompletion)) {
    next[key] = {
      completed: val.completed,
      repsDone: val.repsDone,
      weight: val.weight,
      timestamp: val.timestamp ? new Date(val.timestamp) : undefined,
      rpe: val.rpe,
      rir: val.rir,
      setType: val.setType,
      notes: val.notes,
    };
  }
  return next;
}

async function persistRestTimerState(
  timer: RestTimerState | null,
  previousTimerId: string | null,
  language: UserProfile['preferences']['language'],
  notificationsEnabled: boolean,
  clearTimer: () => Promise<void>,
): Promise<void> {
  clearRestTimerAutoClearTimeout();

  if (timer?.status === 'finished') {
    scheduleRestTimerAutoClear(clearTimer);
  }

  await syncRestTimerNotification({
    timer,
    previousTimerId,
    language,
    enabled: notificationsEnabled,
  });
}

let activeSessionWriteQueue: Promise<void> = Promise.resolve();

function queueActiveSessionWrite(task: () => Promise<void>): Promise<void> {
  const next = activeSessionWriteQueue.then(task, task).catch((err) => {
    console.error('[useWorkoutStore] active session write failed', err);
  });
  activeSessionWriteQueue = next;
  return next;
}

async function waitForActiveSessionWrites(): Promise<void> {
  await activeSessionWriteQueue.catch(() => {});
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
          notes: s.notes,
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
  restTimer: null,
  lastWorkoutSummary: null,
  pendingAchievements: [],
  nutritionEntries: [],
  nutritionGoal: DEFAULT_NUTRITION_GOAL,

  // ── hydrate ────────────────────────────────────────────────────────────────
  hydrate: async () => {
    try {
      await migrateLegacyData();

      const today = new Date().toISOString().slice(0, 10);
      const [profile, library, historyResult, activeSession, nutritionGoal, nutritionEntries] = await Promise.all([
        loadProfile(),
        listRoutines(),
        loadHistory(50),
        loadActiveSession(),
        loadNutritionGoal(),
        loadNutritionEntriesByDate(today),
      ]);

      const nextState: Partial<WorkoutState> = {
        profile,
        routineLibrary: library,
        history: historyResult.entries,
        historyHasMore: historyResult.hasMore,
        nutritionGoal,
        nutritionEntries,
        activeSessionIdx: null,
        setCompletion: {},
        sessionStartTime: null,
        restTimer: null,
      };

      // Restore in-progress session if one exists
      if (activeSession) {
        const routine = await loadRoutine(activeSession.routineId);
        if (routine) {
          const setCompletion = deserializeSetCompletion(activeSession.setCompletion);
          const normalizedRestTimer = normalizeRestTimerState(
            deserializeRestTimer(activeSession.restTimer),
            new Date()
          );

          nextState.currentRoutine = routine;
          nextState.activeSessionIdx = activeSession.sessionIdx;
          nextState.setCompletion = setCompletion;
          nextState.sessionStartTime = new Date(activeSession.startedAt);
          nextState.currentView = 'active-session';
          nextState.restTimer = normalizedRestTimer;

          set({
            ...nextState,
            isHydrated: true,
          });

          syncLocalDataMarkerFromState(get());

          if (normalizedRestTimer) {
            await queueActiveSessionWrite(() => saveActiveSession(
              activeSession.routineId,
              activeSession.sessionId,
              activeSession.sessionIdx,
              setCompletion,
              {
                startedAt: new Date(activeSession.startedAt),
                restTimer: normalizedRestTimer,
              }
            ));
            await persistRestTimerState(
              normalizedRestTimer,
              activeSession.restTimer?.id ?? null,
              profile.preferences.language,
              profile.preferences.timerNotificationsEnabled,
              () => get().clearRestTimer()
            );
          } else if (activeSession.restTimer?.id) {
            await persistRestTimerState(
              null,
              activeSession.restTimer.id,
              profile.preferences.language,
              profile.preferences.timerNotificationsEnabled,
              () => get().clearRestTimer()
            );
          }
          await reconcileAchievementsSilently('hydrate');
          return;
        }
      }

      if (activeSession) {
        await clearActiveSession();
        if (activeSession.restTimer?.id) {
          await persistRestTimerState(
            null,
            activeSession.restTimer.id,
            profile.preferences.language,
            profile.preferences.timerNotificationsEnabled,
            async () => {}
          );
        }
      }

      // No active session — decide initial view
      if (library.length > 0) {
        const restoredRoutine = await loadRoutine(library[0].id);
        if (restoredRoutine) {
          nextState.currentRoutine = restoredRoutine;
          nextState.currentView = 'routine-overview';
        }
      }

      set({
        ...nextState,
        isHydrated: true,
      });

      syncLocalDataMarkerFromState(get());
      await reconcileAchievementsSilently('hydrate');
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
    clearRestTimerAutoClearTimeout();
    set((state) => ({
      currentRoutine: routine,
      currentView: 'routine-overview',
      activeSessionIdx: 0,
      setCompletion: {},
      restTimer: null,
      routineLibrary: [
        summary,
        ...state.routineLibrary.filter((r) => r.id !== routine.id),
      ],
    }));
    syncLocalDataMarkerFromState(get());

    // Ensure IDB write completes before import is considered done
    try {
      await saveRoutine(routine, sourceMarkdown);

      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const { enqueue } = await import('@/lib/sync/queue');
        enqueue({
          table: 'routines',
          operation: 'upsert',
          payload: { id: routine.id },
        }).catch((err) => console.error('[useWorkoutStore] routine enqueue failed', err));
      }
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
    clearRestTimerAutoClearTimeout();
    set({
      currentRoutine: routine,
      currentView: 'routine-overview',
      activeSessionIdx: 0,
      setCompletion: {},
      restTimer: null,
    });
    syncLocalDataMarkerFromState(get());
  },

  deleteRoutineFromLibrary: async (routineId: string) => {
    if (get().currentRoutine?.id === routineId) {
      clearRestTimerAutoClearTimeout();
    }
    set((state) => ({
      routineLibrary: state.routineLibrary.filter((r) => r.id !== routineId),
      ...(state.currentRoutine?.id === routineId
        ? {
            currentRoutine: null,
            currentView: 'uploader' as WorkoutView,
            activeSessionIdx: null,
            setCompletion: {},
            sessionStartTime: null,
            restTimer: null,
          }
        : {}),
    }));
    syncLocalDataMarkerFromState(get());

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      import('@/lib/sync/queue')
        .then(({ enqueue }) => enqueue({
          table: 'routines',
          operation: 'delete',
          payload: { id: routineId },
        }))
        .catch((err) => console.error('[useWorkoutStore] routine delete enqueue failed', err));
    }

    deleteRoutine(routineId).catch(console.error);
  },

  // ── Session lifecycle ──────────────────────────────────────────────────────
  startSession: async (sessionIdx: number) => {
    const { currentRoutine } = get();
    const now = new Date();
    clearRestTimerAutoClearTimeout();
    set({
      currentView: 'active-session',
      activeSessionIdx: sessionIdx,
      sessionStartTime: now,
      restTimer: null,
    });
    syncLocalDataMarkerFromState(get());

    if (currentRoutine) {
      const session = currentRoutine.sessions[sessionIdx];
      if (session) {
        void queueActiveSessionWrite(() => saveActiveSession(currentRoutine.id, session.id, sessionIdx, {}, {
          startedAt: now,
          restTimer: null,
        }));
      }
    }
  },

  startRestTimer: async (durationSeconds: number) => {
    const state = get();
    const { currentRoutine, activeSessionIdx } = state;
    if (!currentRoutine || activeSessionIdx === null) {
      return;
    }

    const session = currentRoutine.sessions[activeSessionIdx];
    if (!session) {
      return;
    }

    const previousTimerId = state.restTimer?.id ?? null;
    const now = new Date();
    const normalizedDurationSeconds = Math.max(0, Math.round(durationSeconds));
    const nextTimer = normalizeRestTimerState({
      id: uuidv4(),
      durationSeconds: normalizedDurationSeconds,
      targetAt: new Date(now.getTime() + normalizedDurationSeconds * 1000),
      remainingMs: normalizedDurationSeconds * 1000,
      status: 'running',
    }, now);

    if (!nextTimer) {
      return;
    }

    set({ restTimer: nextTimer });
    syncLocalDataMarkerFromState(get());

    await queueActiveSessionWrite(() => saveActiveSession(
      currentRoutine.id,
      session.id,
      activeSessionIdx,
      state.setCompletion,
      { restTimer: nextTimer }
    ));

    await persistRestTimerState(
      nextTimer,
      previousTimerId,
      state.profile.preferences.language,
      state.profile.preferences.timerNotificationsEnabled,
      () => get().clearRestTimer()
    );
  },

  pauseRestTimer: async () => {
    const state = get();
    const timer = state.restTimer;
    const { currentRoutine, activeSessionIdx } = state;
    if (!currentRoutine || activeSessionIdx === null || !timer || timer.status !== 'running') {
      return;
    }

    const session = currentRoutine.sessions[activeSessionIdx];
    if (!session) {
      return;
    }

    const now = new Date();
    const remainingMs = Math.max(0, timer.targetAt.getTime() - now.getTime());
    const nextTimer = normalizeRestTimerState({
      ...timer,
      targetAt: new Date(now.getTime() + remainingMs),
      remainingMs,
      status: remainingMs <= 0 ? 'finished' : 'paused',
    }, now);

    if (!nextTimer) {
      return;
    }

    set({ restTimer: nextTimer });
    syncLocalDataMarkerFromState(get());

    await queueActiveSessionWrite(() => saveActiveSession(
      currentRoutine.id,
      session.id,
      activeSessionIdx,
      state.setCompletion,
      { restTimer: nextTimer }
    ));

    await persistRestTimerState(
      nextTimer,
      timer.id,
      state.profile.preferences.language,
      state.profile.preferences.timerNotificationsEnabled,
      () => get().clearRestTimer()
    );
  },

  resumeRestTimer: async () => {
    const state = get();
    const timer = state.restTimer;
    const { currentRoutine, activeSessionIdx } = state;
    if (!currentRoutine || activeSessionIdx === null || !timer || timer.status !== 'paused') {
      return;
    }

    const session = currentRoutine.sessions[activeSessionIdx];
    if (!session) {
      return;
    }

    const now = new Date();
    const remainingMs = Math.max(0, Math.round(timer.remainingMs));
    if (remainingMs <= 0) {
      await get().finishRestTimer();
      return;
    }

    const nextTimer = normalizeRestTimerState({
      ...timer,
      targetAt: new Date(now.getTime() + remainingMs),
      remainingMs,
      status: 'running',
    }, now);

    if (!nextTimer) {
      return;
    }

    set({ restTimer: nextTimer });
    syncLocalDataMarkerFromState(get());

    await queueActiveSessionWrite(() => saveActiveSession(
      currentRoutine.id,
      session.id,
      activeSessionIdx,
      state.setCompletion,
      { restTimer: nextTimer }
    ));

    await persistRestTimerState(
      nextTimer,
      timer.id,
      state.profile.preferences.language,
      state.profile.preferences.timerNotificationsEnabled,
      () => get().clearRestTimer()
    );
  },

  adjustRestTimer: async (deltaSeconds: number) => {
    const state = get();
    const timer = state.restTimer;
    const { currentRoutine, activeSessionIdx } = state;
    if (!currentRoutine || activeSessionIdx === null || !timer || timer.status === 'finished') {
      return;
    }

    const session = currentRoutine.sessions[activeSessionIdx];
    if (!session) {
      return;
    }

    const deltaMs = Math.round(deltaSeconds) * 1000;
    const now = new Date();
    const nextRemainingMs = timer.status === 'running'
      ? Math.max(0, timer.targetAt.getTime() - now.getTime() + deltaMs)
      : Math.max(0, Math.round(timer.remainingMs) + deltaMs);

    if (nextRemainingMs <= 0) {
      await get().finishRestTimer();
      return;
    }

    const nextTimer = normalizeRestTimerState({
      ...timer,
      targetAt: new Date(now.getTime() + nextRemainingMs),
      remainingMs: nextRemainingMs,
      status: timer.status,
    }, now);

    if (!nextTimer) {
      return;
    }

    set({ restTimer: nextTimer });
    syncLocalDataMarkerFromState(get());

    await queueActiveSessionWrite(() => saveActiveSession(
      currentRoutine.id,
      session.id,
      activeSessionIdx,
      state.setCompletion,
      { restTimer: nextTimer }
    ));

    await persistRestTimerState(
      nextTimer,
      timer.id,
      state.profile.preferences.language,
      state.profile.preferences.timerNotificationsEnabled,
      () => get().clearRestTimer()
    );
  },

  finishRestTimer: async () => {
    const state = get();
    const timer = state.restTimer;
    const { currentRoutine, activeSessionIdx } = state;
    if (!currentRoutine || activeSessionIdx === null || !timer) {
      return;
    }

    const session = currentRoutine.sessions[activeSessionIdx];
    if (!session) {
      return;
    }

    const now = new Date();
    const nextTimer = normalizeRestTimerState({
      ...timer,
      targetAt: now,
      remainingMs: 0,
      status: 'finished',
    }, now);

    if (!nextTimer) {
      return;
    }

    set({ restTimer: nextTimer });
    syncLocalDataMarkerFromState(get());

    await queueActiveSessionWrite(() => saveActiveSession(
      currentRoutine.id,
      session.id,
      activeSessionIdx,
      state.setCompletion,
      { restTimer: nextTimer }
    ));

    await persistRestTimerState(
      nextTimer,
      timer.id,
      state.profile.preferences.language,
      state.profile.preferences.timerNotificationsEnabled,
      () => get().clearRestTimer()
    );
  },

  clearRestTimer: async () => {
    const state = get();
    const timer = state.restTimer;
    const { currentRoutine, activeSessionIdx } = state;
    clearRestTimerAutoClearTimeout();

    if (!timer) {
      return;
    }

    set({ restTimer: null });
    syncLocalDataMarkerFromState(get());

    if (currentRoutine && activeSessionIdx !== null) {
      const session = currentRoutine.sessions[activeSessionIdx];
      if (session) {
        await queueActiveSessionWrite(() => saveActiveSession(
          currentRoutine.id,
          session.id,
          activeSessionIdx,
          state.setCompletion,
          { restTimer: null }
        ));
      }
    }

    await persistRestTimerState(
      null,
      timer.id,
      state.profile.preferences.language,
      state.profile.preferences.timerNotificationsEnabled,
      async () => {}
    );
  },

  toggleSetCompletion: (
    sessionIdx,
    exerciseId,
    setIdx,
    repsDone?,
    weight?,
    rpe?,
    rir?,
    setType?,
    notes?
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
          notes: notes ?? current?.notes,
        },
      };

      // Fire-and-forget IDB write
      const { currentRoutine, activeSessionIdx } = state;
      if (currentRoutine && activeSessionIdx !== null) {
        const session = currentRoutine.sessions[activeSessionIdx];
        if (session) {
          void queueActiveSessionWrite(() => saveActiveSession(
            currentRoutine.id,
            session.id,
            activeSessionIdx,
            next
          ));
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

    await get().clearRestTimer();

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
          profile: state.profile,
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
      await waitForActiveSessionWrites();
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
    await get().clearRestTimer();
    await waitForActiveSessionWrites();
    set({
      currentView: 'routine-overview',
      setCompletion: {},
      activeSessionIdx: null,
      sessionStartTime: null,
      restTimer: null,
    });
    clearActiveSession().catch(console.error);
    syncLocalDataMarkerFromState(get());
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

  // ── Nutrition ─────────────────────────────────────────────────────────────
  loadNutritionDay: async (date: string) => {
    const entries = await loadNutritionEntriesByDate(date);
    set({ nutritionEntries: entries });
  },

  saveNutritionEntry: async (entry) => {
    const now = new Date().toISOString();
    const existing = entry.id ? await loadNutritionEntry(entry.id) : null;
    const nextEntry: NutritionEntry = {
      id: entry.id ?? uuidv4(),
      date: entry.date,
      mealType: entry.mealType,
      foodName: entry.foodName.trim(),
      servingLabel: entry.servingLabel.trim() || '1 porción',
      calories: Math.max(0, Math.round(entry.calories)),
      proteinGrams: Math.max(0, entry.proteinGrams),
      carbsGrams: Math.max(0, entry.carbsGrams),
      fatGrams: Math.max(0, entry.fatGrams),
      notes: entry.notes?.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };

    await saveNutritionEntryRecord(nextEntry);
    const entries = await loadNutritionEntriesByDate(nextEntry.date);
    set({ nutritionEntries: entries });
  },

  deleteNutritionEntry: async (id: string) => {
    const currentDate = get().nutritionEntries.find((entry) => entry.id === id)?.date;
    await deleteNutritionEntryRecord(id);
    if (currentDate) {
      const entries = await loadNutritionEntriesByDate(currentDate);
      set({ nutritionEntries: entries });
    } else {
      set((state) => ({
        nutritionEntries: state.nutritionEntries.filter((entry) => entry.id !== id),
      }));
    }
  },

  updateNutritionGoal: async (patch) => {
    const nextGoal = {
      ...get().nutritionGoal,
      ...patch,
      calories: Math.max(0, Math.round(patch.calories ?? get().nutritionGoal.calories)),
      proteinGrams: Math.max(0, patch.proteinGrams ?? get().nutritionGoal.proteinGrams),
      carbsGrams: Math.max(0, patch.carbsGrams ?? get().nutritionGoal.carbsGrams),
      fatGrams: Math.max(0, patch.fatGrams ?? get().nutritionGoal.fatGrams),
      updatedAt: new Date().toISOString(),
    };
    set({ nutritionGoal: nextGoal });
    await saveNutritionGoal(nextGoal);
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
    saveRoutine(updatedRoutine)
      .then(async () => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          const { enqueue } = await import('@/lib/sync/queue');
          enqueue({
            table: 'routines',
            operation: 'upsert',
            payload: { id: updatedRoutine.id },
          }).catch((err) => console.error('[useWorkoutStore] routine enqueue failed', err));
        }
      })
      .catch(console.error);
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

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { enqueue } = await import('@/lib/sync/queue');
      enqueue({
        table: 'routines',
        operation: 'upsert',
        payload: { id: copy.id },
      }).catch((err) => console.error('[useWorkoutStore] routine enqueue failed', err));
    }
  },

  refreshFromPersistence: async () => {
    try {
      const [profile, library, historyResult, activeSession] = await Promise.all([
        loadProfile(),
        listRoutines(),
        loadHistory(50),
        loadActiveSession(),
      ]);
      await reconcileAchievementsSilently('refreshFromPersistence');

      const state = get();
      const nextState: Partial<WorkoutState> = {
        profile,
        routineLibrary: library,
        history: historyResult.entries,
        historyHasMore: historyResult.hasMore,
        activeSessionIdx: null,
        setCompletion: {},
        sessionStartTime: null,
        restTimer: null,
      };

      if (activeSession) {
        const routine = await loadRoutine(activeSession.routineId);
        if (routine) {
          const setCompletion = deserializeSetCompletion(activeSession.setCompletion);
          const normalizedRestTimer = normalizeRestTimerState(
            deserializeRestTimer(activeSession.restTimer),
            new Date()
          );

          nextState.currentRoutine = routine;
          nextState.activeSessionIdx = activeSession.sessionIdx;
          nextState.setCompletion = setCompletion;
          nextState.sessionStartTime = new Date(activeSession.startedAt);
          nextState.currentView = 'active-session';
          nextState.restTimer = normalizedRestTimer;

          set(nextState);
          syncLocalDataMarkerFromState(get());

          if (normalizedRestTimer) {
            await queueActiveSessionWrite(() => saveActiveSession(
              activeSession.routineId,
              activeSession.sessionId,
              activeSession.sessionIdx,
              setCompletion,
              {
                startedAt: new Date(activeSession.startedAt),
                restTimer: normalizedRestTimer,
              }
            ));
            await persistRestTimerState(
              normalizedRestTimer,
              activeSession.restTimer?.id ?? null,
              profile.preferences.language,
              profile.preferences.timerNotificationsEnabled,
              () => get().clearRestTimer()
            );
          } else if (activeSession.restTimer?.id) {
            await persistRestTimerState(
              null,
              activeSession.restTimer.id,
              profile.preferences.language,
              profile.preferences.timerNotificationsEnabled,
              async () => {}
            );
          }

          return;
        }

        await clearActiveSession();
        if (activeSession.restTimer?.id) {
          await persistRestTimerState(
            null,
            activeSession.restTimer.id,
            profile.preferences.language,
            profile.preferences.timerNotificationsEnabled,
            async () => {}
          );
        }
      }

      if (state.activeSessionIdx === null && state.currentRoutine) {
        const refreshedRoutine = await loadRoutine(state.currentRoutine.id);
        if (refreshedRoutine) {
          nextState.currentRoutine = refreshedRoutine;
        } else {
          nextState.currentRoutine = null;
          if (state.currentView === 'routine-overview') {
            nextState.currentView = 'uploader';
          }
        }
      }

      set(nextState);
      syncLocalDataMarkerFromState(get());
    } catch (err) {
      console.error('[useWorkoutStore] refreshFromPersistence failed', err);
    }
  },

  // ── resetAll ───────────────────────────────────────────────────────────────
  resetAll: async () => {
    clearRestTimerAutoClearTimeout();
    set({
      currentRoutine: null,
      currentView: 'uploader',
      activeSessionIdx: null,
      setCompletion: {},
      history: [],
      routineLibrary: [],
      sessionStartTime: null,
      restTimer: null,
      lastWorkoutSummary: null,
      pendingAchievements: [],
    });
    clearLocalDataMarker();
    // Clear workout data in background, preserving profile
    waitForActiveSessionWrites()
      .then(() => clearWorkoutData())
      .catch(console.error);
  },
}));
