'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SetRow } from '@/components/workout/SetRow';
import { RestTimer } from '@/components/workout/RestTimer';
import { SetInputSheet } from '@/components/workout/overlays/SetInputSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useWakeLock } from '@/hooks/useWakeLock';
import { ChevronLeft, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react';

interface PendingSet {
  exerciseId: string;
  exerciseName: string;
  setIdx: number;
  targetRepsMax: number;
  lastWeight?: number;
}

function getLastWeight(
  setCompletion: Record<string, { completed: boolean; weight?: number }>,
  sessionIdx: number,
  exerciseId: string
): number | undefined {
  const prefix = `${sessionIdx}-${exerciseId}-`;
  let last: number | undefined;
  for (const [key, status] of Object.entries(setCompletion)) {
    if (key.startsWith(prefix) && status.completed && status.weight != null) {
      last = status.weight;
    }
  }
  return last;
}

export function ActiveSessionView() {
  const {
    currentRoutine,
    activeSessionIdx,
    setCurrentView,
    setCompletion,
    toggleSetCompletion,
    finishSession,
    abandonSession,
    profile,
  } = useWorkoutStore();

  const { isLocked } = useWakeLock(true);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [pendingSet, setPendingSet] = useState<PendingSet | null>(null);
  const [showAbandon, setShowAbandon] = useState(false);

  const activeSession = currentRoutine?.sessions[activeSessionIdx ?? 0];
  if (!activeSession) return null;

  const totalSets = activeSession.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = Object.values(setCompletion).filter((s) => s.completed).length;

  const handleRequestSetCompletion = (
    exerciseId: string,
    exerciseName: string,
    setIdx: number,
    repsMax: number,
    restSeconds: number
  ) => {
    if (activeSessionIdx === null) return;
    const isAlreadyCompleted = setCompletion[`${activeSessionIdx}-${exerciseId}-${setIdx}`]?.completed;
    if (isAlreadyCompleted) {
      // Toggle off immediately — no input needed
      toggleSetCompletion(activeSessionIdx, exerciseId, setIdx);
      return;
    }
    setRestDuration(restSeconds || profile.defaultRestSeconds);
    // Dismiss rest timer when starting to log a new set
    setShowRestTimer(false);
    setPendingSet({
      exerciseId,
      exerciseName,
      setIdx,
      targetRepsMax: repsMax,
      lastWeight: getLastWeight(setCompletion, activeSessionIdx, exerciseId),
    });
  };

  const handleConfirmSet = (repsDone: number, weight: number | undefined) => {
    if (pendingSet === null || activeSessionIdx === null) return;
    toggleSetCompletion(activeSessionIdx, pendingSet.exerciseId, pendingSet.setIdx, repsDone, weight);
    setShowRestTimer(true);
    setPendingSet(null);
  };

  return (
    <motion.div
      key="active-session"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-6 px-4"
    >
      {/* Session progress */}
      <div className="-mt-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Progress</span>
          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
            {completedSets} / {totalSets}
          </span>
        </div>
        <div
          className="h-1 w-full bg-white/5 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={completedSets}
          aria-valuemin={0}
          aria-valuemax={totalSets}
          aria-label={`Workout progress: ${completedSets} of ${totalSets} sets completed`}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
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
            <ChevronLeft className="w-6 h-6 text-white" />
          </Button>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none font-display">{activeSession.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              {isLocked && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">WAKE LOCK ON</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="glass-icon"
          size="icon-lg"
          onClick={() => setShowRestTimer(true)}
          aria-label="Open rest timer"
        >
          <Clock className="w-6 h-6 text-blue-400" />
        </Button>
      </div>

      <div className="grid gap-8">
        {activeSession.exercises.map((exercise) => (
          <div key={exercise.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white tracking-tighter uppercase font-display">{exercise.cleanName}</h3>
              <span className="text-xs font-black text-white/50 uppercase tracking-[0.25em]">
                {exercise.sets} Sets / {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''} Reps
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: exercise.sets }).map((_, setIdx) => (
                <SetRow
                  key={setIdx}
                  setIdx={setIdx}
                  sessionIdx={activeSessionIdx!}
                  exercise={exercise}
                  isCompleted={!!setCompletion[`${activeSessionIdx}-${exercise.id}-${setIdx}`]?.completed}
                  onRequestComplete={() =>
                    handleRequestSetCompletion(
                      exercise.id,
                      exercise.cleanName,
                      setIdx,
                      exercise.repsMax,
                      exercise.restSeconds
                    )
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Button
          variant="glass-primary"
          size="xl"
          onClick={() => finishSession()}
          className="w-full rounded-[var(--radius-xl)] gap-4 group mt-4 !bg-emerald-500/25 hover:!bg-emerald-500/35 border-emerald-500/20"
        >
          <CheckCircle2 className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" />
          FINISH WORKOUT
        </Button>
        <button
          onClick={() => setShowAbandon(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-white/40 hover:text-red-400 transition-colors text-[11px] font-black uppercase tracking-[0.2em]"
        >
          <XCircle className="w-3.5 h-3.5" />
          Abandon Workout
        </button>
      </div>

      <AnimatePresence>
        {showRestTimer && (
          <RestTimer
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

      <ConfirmDialog
        open={showAbandon}
        title="Abandon Workout?"
        message="All progress will be lost."
        confirmLabel="Abandon"
        cancelLabel="Keep Going"
        variant="danger"
        onConfirm={() => { abandonSession(); setShowAbandon(false); }}
        onCancel={() => setShowAbandon(false)}
      />
    </motion.div>
  );
}
