'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SetRow, type AutoSuggestion, type SetRowState } from '@/components/workout/SetRow';
import { RestTimer } from '@/components/workout/RestTimer';
import { SetInputSheet } from '@/components/workout/overlays/SetInputSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useWakeLock } from '@/hooks/useWakeLock';
import type { HistoryEntry, WorkoutState } from '@/types/workout';
import { ChevronLeft, Clock, Zap, CheckCircle2, MousePointerClick, ChevronsRight, X, CheckCheck, Pencil } from 'lucide-react';
import { EditSessionSheet } from '@/components/workout/overlays/EditSessionSheet';
import { ExerciseDetailSheet } from '@/components/workout/overlays/ExerciseDetailSheet';

interface PendingSet {
  exerciseId: string;
  exerciseName: string;
  setIdx: number;
  targetRepsMax: number;
  lastWeight?: number;
}

interface ArmedPreview {
  key: string;
  suggestion: AutoSuggestion;
}

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

function toPositiveNumber(value: number | null | undefined): number | undefined {
  if (value == null || Number.isNaN(value) || value <= 0) {
    return undefined;
  }

  return value;
}

function getSameSessionPreviousSetSuggestion(
  setCompletion: WorkoutState['setCompletion'],
  sessionIdx: number,
  exerciseId: string,
  setIdx: number
): AutoSuggestion | null {
  for (let i = setIdx - 1; i >= 0; i -= 1) {
    const status = setCompletion[`${sessionIdx}-${exerciseId}-${i}`];
    if (status?.completed && (status.repsDone ?? 0) > 0) {
      return {
        repsDone: status.repsDone ?? 0,
        weight: toPositiveNumber(status.weight),
      };
    }
  }

  return null;
}

function getHistorySetSuggestion(
  history: HistoryEntry[],
  exerciseId: string,
  exerciseName: string,
  setIdx: number
): AutoSuggestion | null {
  const normalizedExerciseName = normalizeExerciseName(exerciseName);

  for (const entry of history) {
    const matchingExercise =
      entry.volumeData.find((ev) => ev.exerciseId === exerciseId) ??
      entry.volumeData.find((ev) => normalizeExerciseName(ev.cleanName) === normalizedExerciseName);

    if (!matchingExercise?.setDetails?.length) {
      continue;
    }

    const matchingSet = matchingExercise.setDetails.find(
      (setDetail) => setDetail.setIdx === setIdx && setDetail.repsDone > 0
    );

    if (!matchingSet) {
      continue;
    }

    return {
      repsDone: matchingSet.repsDone,
      weight: toPositiveNumber(matchingSet.weight),
    };
  }

  return null;
}

function getAutoSetSuggestion(params: {
  setCompletion: WorkoutState['setCompletion'];
  history: HistoryEntry[];
  sessionIdx: number;
  exerciseId: string;
  exerciseName: string;
  setIdx: number;
}): AutoSuggestion | null {
  const sameSessionSuggestion = getSameSessionPreviousSetSuggestion(
    params.setCompletion,
    params.sessionIdx,
    params.exerciseId,
    params.setIdx
  );

  if (sameSessionSuggestion) {
    return sameSessionSuggestion;
  }

  return getHistorySetSuggestion(
    params.history,
    params.exerciseId,
    params.exerciseName,
    params.setIdx
  );
}

const HINT_KEY = 'routyne-gesture-hint-v1';

function GestureHintBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex items-center gap-3">
          {/* Tap */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-400/15 bg-sky-500/[0.07]">
              <MousePointerClick className="h-3.5 w-3.5 text-sky-400/70" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Tap</p>
              <p className="truncate text-[11px] font-semibold leading-tight text-white/50">Log manually</p>
            </div>
          </div>

          <div className="h-7 w-px shrink-0 bg-white/[0.06]" />

          {/* Swipe */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/[0.07]">
              <ChevronsRight className="h-3.5 w-3.5 text-emerald-400/70" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Swipe →</p>
              <p className="truncate text-[11px] font-semibold leading-tight text-white/50">Auto-fill last</p>
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="ml-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/25 transition-colors hover:text-white/50"
            aria-label="Dismiss gesture hint"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function ActiveSessionView() {
  const {
    currentRoutine,
    activeSessionIdx,
    setCurrentView,
    setCompletion,
    history,
    toggleSetCompletion,
    finishSession,
    abandonSession,
    profile,
    updateActiveSessionExercises,
  } = useWorkoutStore();

  const { isLocked } = useWakeLock(true);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerKey, setRestTimerKey] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [showAbandon, setShowAbandon] = useState(false);
  const [pendingSet, setPendingSet] = useState<PendingSet | null>(null);
  const [armedPreview, setArmedPreview] = useState<ArmedPreview | null>(null);
  const [hintVisible, setHintVisible] = useState(
    () => typeof window !== 'undefined' && !localStorage.getItem(HINT_KEY)
  );
  const [showEditSession, setShowEditSession] = useState(false);
  const [detailExercise, setDetailExercise] = useState<string | null>(null);

  const dismissHint = () => {
    localStorage.setItem(HINT_KEY, '1');
    setHintVisible(false);
  };

  const activeSession = currentRoutine?.sessions[activeSessionIdx ?? 0];
  if (!activeSession) return null;

  const totalSets = activeSession.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = Object.values(setCompletion).filter((s) => s.completed).length;

  const clearArmedPreview = () => setArmedPreview(null);

  const completeSet = (
    exerciseId: string,
    setIdx: number,
    repsDone: number,
    weight: number | undefined,
    restSeconds: number
  ) => {
    if (activeSessionIdx === null) return;

    toggleSetCompletion(activeSessionIdx, exerciseId, setIdx, repsDone, weight);
    clearArmedPreview();
    setPendingSet(null);
    dismissHint();
    setRestDuration(restSeconds || profile.defaultRestSeconds);
    setRestTimerKey((prev) => prev + 1);
    setShowRestTimer(true);
  };

  const openManualEntry = (
    exerciseId: string,
    exerciseName: string,
    setIdx: number,
    repsMax: number,
    restSeconds: number,
    suggestion?: AutoSuggestion | null
  ) => {
    clearArmedPreview();
    setShowRestTimer(false);
    setRestDuration(restSeconds || profile.defaultRestSeconds);
    setPendingSet({
      exerciseId,
      exerciseName,
      setIdx,
      targetRepsMax: suggestion?.repsDone ?? repsMax,
      lastWeight: suggestion?.weight,
    });
  };

  const handleRowSwipe = (
    exerciseId: string,
    exerciseName: string,
    setIdx: number,
    repsMax: number,
    restSeconds: number
  ) => {
    if (activeSessionIdx === null) return;

    const key = `${activeSessionIdx}-${exerciseId}-${setIdx}`;
    const currentStatus = setCompletion[key];
    const isCompleted = !!currentStatus?.completed;

    if (isCompleted) {
      toggleSetCompletion(activeSessionIdx, exerciseId, setIdx);
      clearArmedPreview();
      return;
    }

    const suggestion = getAutoSetSuggestion({
      setCompletion,
      history,
      sessionIdx: activeSessionIdx,
      exerciseId,
      exerciseName,
      setIdx,
    });

    if (armedPreview?.key === key && suggestion) {
      completeSet(exerciseId, setIdx, suggestion.repsDone, suggestion.weight, restSeconds);
      return;
    }

    if (suggestion) {
      setPendingSet(null);
      setArmedPreview({ key, suggestion });
      return;
    }

    openManualEntry(exerciseId, exerciseName, setIdx, repsMax, restSeconds);
  };

  const handleRowTap = (
    exerciseId: string,
    exerciseName: string,
    setIdx: number,
    repsMax: number,
    restSeconds: number
  ) => {
    if (activeSessionIdx === null) return;

    const key = `${activeSessionIdx}-${exerciseId}-${setIdx}`;
    const currentStatus = setCompletion[key];
    const isCompleted = !!currentStatus?.completed;

    if (isCompleted) {
      toggleSetCompletion(activeSessionIdx, exerciseId, setIdx);
      clearArmedPreview();
      return;
    }

    const suggestion = getAutoSetSuggestion({
      setCompletion,
      history,
      sessionIdx: activeSessionIdx,
      exerciseId,
      exerciseName,
      setIdx,
    });

    if (armedPreview?.key === key) {
      openManualEntry(exerciseId, exerciseName, setIdx, repsMax, restSeconds, suggestion);
      return;
    }

    // Always open manual entry on tap — regardless of whether a suggestion exists
    openManualEntry(exerciseId, exerciseName, setIdx, repsMax, restSeconds, suggestion);
  };

  const handleAutoFillExercise = (
    exerciseId: string,
    exerciseName: string,
    sets: number,
    repsMax: number
  ) => {
    if (activeSessionIdx === null) return;

    let anyCompleted = false;

    for (let setIdx = 0; setIdx < sets; setIdx++) {
      const key = `${activeSessionIdx}-${exerciseId}-${setIdx}`;
      const currentStatus = setCompletion[key];
      if (currentStatus?.completed) continue;

      const suggestion = getAutoSetSuggestion({
        setCompletion,
        history,
        sessionIdx: activeSessionIdx,
        exerciseId,
        exerciseName,
        setIdx,
      });

      const repsDone = suggestion?.repsDone ?? repsMax;
      const weight = suggestion?.weight;

      toggleSetCompletion(activeSessionIdx, exerciseId, setIdx, repsDone, weight);
      anyCompleted = true;
    }

    if (anyCompleted) {
      clearArmedPreview();
      setPendingSet(null);
      if ('vibrate' in navigator) navigator.vibrate([30, 50, 30]);
    }
  };

  const handleConfirmSet = (repsDone: number, weight: number | undefined) => {
    if (pendingSet === null) return;

    const exercise = activeSession.exercises.find((item) => item.id === pendingSet.exerciseId);
    completeSet(
      pendingSet.exerciseId,
      pendingSet.setIdx,
      repsDone,
      weight,
      exercise?.restSeconds ?? profile.defaultRestSeconds
    );
  };

  const mainContent = (
    <motion.div
      key="active-session"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 px-4 pb-6"
    >
      <div className="-mt-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Progress</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
            {completedSets} / {totalSets}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
          role="progressbar"
          aria-valuenow={completedSets}
          aria-valuemin={0}
          aria-valuemax={totalSets > 0 ? totalSets : 1}
          aria-label={`Workout progress: ${completedSets} of ${totalSets} sets completed`}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400"
            initial={{ width: 0 }}
            animate={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="glass-icon"
            size="icon-lg"
            onClick={() => setCurrentView('routine-overview')}
            aria-label="Back to overview"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </Button>
          <div>
            <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tighter text-white">
              {activeSession.title}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              {isLocked && (
                <div className="flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5">
                  <Zap className="h-3 w-3 fill-blue-400 text-blue-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Wake Lock On</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditSession(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
            aria-label="Edit session"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <Button
            variant="glass-icon"
            size="icon-lg"
            onClick={() => setShowRestTimer(true)}
            aria-label="Open rest timer"
          >
            <Clock className="h-6 w-6 text-blue-400" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {hintVisible && <GestureHintBanner onDismiss={dismissHint} />}
      </AnimatePresence>

      <div className="grid gap-7">
        {activeSession.exercises.map((exercise) => (
          <div key={exercise.id} className={`space-y-2.5 ${exercise.supersetId ? 'border-l-2 border-purple-500/30 pl-3 -ml-1' : ''}`}>
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex flex-1 items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setDetailExercise(exercise.cleanName)}
                  className="truncate font-display text-lg font-black uppercase tracking-tight text-white/90 hover:text-blue-300 transition-colors text-left cursor-pointer"
                >
                  {exercise.cleanName}
                </button>
                {exercise.supersetId && (
                  <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                    Superset
                  </span>
                )}
                {Array.from({ length: exercise.sets }).some((_, i) => !setCompletion[`${activeSessionIdx}-${exercise.id}-${i}`]?.completed) && (
                  <button
                    onClick={() => handleAutoFillExercise(exercise.id, exercise.cleanName, exercise.sets, exercise.repsMax)}
                    className="shrink-0 flex items-center gap-1.5 rounded-md border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-sky-300 transition-colors hover:bg-sky-500/20 active:scale-95"
                    aria-label={`Log all remaining sets for ${exercise.cleanName}`}
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">All</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: exercise.sets }).map((_, setIdx) => {
                const key = `${activeSessionIdx}-${exercise.id}-${setIdx}`;
                const currentStatus = setCompletion[key];
                const latestSuggestion = getAutoSetSuggestion({
                  setCompletion,
                  history,
                  sessionIdx: activeSessionIdx ?? 0,
                  exerciseId: exercise.id,
                  exerciseName: exercise.cleanName,
                  setIdx,
                });
                const phase: SetRowState = currentStatus?.completed
                  ? 'completed'
                  : armedPreview?.key === key
                    ? 'armed'
                    : 'idle';

                return (
                  <SetRow
                    key={key}
                    setIdx={setIdx}
                    exercise={exercise}
                    setStatus={currentStatus}
                    weightUnit={profile.weightUnit}
                    phase={phase}
                    latestSuggestion={latestSuggestion}
                    preview={armedPreview?.key === key ? armedPreview.suggestion : null}
                    onSwipe={() => handleRowSwipe(
                      exercise.id,
                      exercise.cleanName,
                      setIdx,
                      exercise.repsMax,
                      exercise.restSeconds
                    )}
                    onTap={() => handleRowTap(
                      exercise.id,
                      exercise.cleanName,
                      setIdx,
                      exercise.repsMax,
                      exercise.restSeconds
                    )}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Button
          variant="glass-primary"
          size="xl"
          onClick={() => finishSession()}
          className="group mt-4 w-full gap-4 rounded-[var(--radius-xl)] border-emerald-500/20 !bg-emerald-500/25 hover:!bg-emerald-500/35"
        >
          <CheckCircle2 className="h-7 w-7 text-emerald-400 transition-transform group-hover:scale-110" />
          Finish Workout
        </Button>
        <button
          onClick={() => setShowAbandon(true)}
          className="w-full py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-red-400"
        >
          Abandon Workout
        </button>
      </div>
    </motion.div>
  );

  return (
    <>
      {mainContent}

      <AnimatePresence>
        {showRestTimer && (
          <RestTimer
            key={restTimerKey}
            duration={restDuration}
            onClose={() => setShowRestTimer(false)}
            onFinish={() => {
              if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingSet && (
          <SetInputSheet
            isOpen={true}
            onClose={() => setPendingSet(null)}
            onConfirm={handleConfirmSet}
            exerciseName={pendingSet.exerciseName}
            setIdx={pendingSet.setIdx}
            targetRepsMax={pendingSet.targetRepsMax}
            lastWeight={pendingSet.lastWeight}
            weightUnit={profile.weightUnit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditSession && (
          <EditSessionSheet
            exercises={activeSession.exercises}
            onClose={() => setShowEditSession(false)}
            onSave={(updated) => {
              updateActiveSessionExercises(updated);
              setShowEditSession(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailExercise && (
          <ExerciseDetailSheet
            exerciseName={detailExercise}
            history={history}
            weightUnit={profile.weightUnit}
            onClose={() => setDetailExercise(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showAbandon}
        title="Abandon Workout?"
        message="All progress will be lost."
        confirmLabel="Abandon"
        cancelLabel="Keep Going"
        variant="danger"
        onConfirm={() => {
          abandonSession();
          setShowAbandon(false);
        }}
        onCancel={() => setShowAbandon(false)}
      />
    </>
  );
}
