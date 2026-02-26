import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RoutineData, WorkoutState, WorkoutView, HistoryEntry, SetStatus, ExerciseVolume } from '@/types/workout';
import { v4 as uuidv4 } from 'uuid';

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      currentRoutine: null,
      currentView: 'uploader',
      activeSessionIdx: null,
      isLoading: false,
      setCompletion: {},
      history: [],

      setCurrentRoutine: (routine: RoutineData) => set({
        currentRoutine: routine,
        currentView: 'routine-overview',
        activeSessionIdx: 0,
        setCompletion: {}
      }),

      setCurrentView: (view: WorkoutView) => set({ currentView: view }),

      setIsLoading: (isLoading: boolean) => set({ isLoading }),

      startSession: (sessionIdx: number) => set({
        currentView: 'active-session',
        activeSessionIdx: sessionIdx
      }),

      toggleSetCompletion: (sessionIdx, exerciseId, setIdx, repsDone?, weight?) =>
        set((state) => {
          const key = `${sessionIdx}-${exerciseId}-${setIdx}`;
          const currentStatus = state.setCompletion[key];
          return {
            setCompletion: {
              ...state.setCompletion,
              [key]: {
                completed: !currentStatus?.completed,
                repsDone: repsDone ?? currentStatus?.repsDone,
                weight: weight ?? currentStatus?.weight,
                timestamp: new Date(),
              },
            },
          };
        }),

      finishSession: () => set((state) => {
        if (!state.currentRoutine || state.activeSessionIdx === null) return state;

        const activeSession = state.currentRoutine.sessions[state.activeSessionIdx];

        const volumeData: ExerciseVolume[] = activeSession.exercises
          .map((ex) => {
            const completedSets = Object.entries(state.setCompletion).filter(
              ([key, status]) =>
                key.startsWith(`${state.activeSessionIdx}-${ex.id}-`) && status.completed
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
            };
          })
          .filter((ev) => ev.setsCompleted > 0);

        const newEntry: HistoryEntry = {
          id: uuidv4(),
          sessionIdx: state.activeSessionIdx,
          sessionTitle: activeSession.title,
          completedAt: new Date(),
          completedExercises: volumeData.map((ev) => ev.exerciseId),
          volumeData,
          totalVolume: volumeData.reduce((sum, ev) => sum + ev.totalVolume, 0),
        };

        return {
          currentView: 'history',
          history: [newEntry, ...state.history],
          setCompletion: {},
        };
      }),

      resetProgress: () => set({ setCompletion: {} }),

      resetAll: () => set({
        currentRoutine: null,
        currentView: 'uploader',
        activeSessionIdx: null,
        setCompletion: {},
        history: []
      }),
    }),
    {
      name: 'routyne-storage',
      partialize: (state) => ({
        history: state.history,
        currentRoutine: state.currentRoutine,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.history = state.history.map((entry) => ({
          ...entry,
          completedAt: new Date(entry.completedAt as unknown as string),
        }));
        if (state.currentRoutine) {
          state.currentRoutine = {
            ...state.currentRoutine,
            createdAt: new Date(state.currentRoutine.createdAt as unknown as string),
          };
        }
      },
    }
  )
);
