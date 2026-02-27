'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SetRow } from '@/components/workout/SetRow';
import { RestTimer } from '@/components/workout/RestTimer';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ChevronLeft, Clock, Zap, CheckCircle2 } from 'lucide-react';

export function ActiveSessionView() {
  const {
    currentRoutine,
    activeSessionIdx,
    setCurrentView,
    setCompletion,
    toggleSetCompletion,
    finishSession,
  } = useWorkoutStore();

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);

  const activeSession = currentRoutine?.sessions[activeSessionIdx ?? 0];
  if (!activeSession) return null;

  const totalSets = activeSession.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = Object.values(setCompletion).filter(s => s.completed).length;

  const handleSetCompletion = (sessionIdx: number, exerciseId: string, setIdx: number, restSeconds: number, repsMax?: number) => {
    const isCompleted = setCompletion[`${sessionIdx}-${exerciseId}-${setIdx}`]?.completed;
    toggleSetCompletion(sessionIdx, exerciseId, setIdx, repsMax);

    if (!isCompleted) {
      setRestDuration(restSeconds || 90);
      setShowRestTimer(true);
    }
  };

  return (
    <motion.div
      key="active-session"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12 pb-20 px-2 sm:px-0"
    >
      {/* Session progress */}
      <div className="px-2 sm:px-0 -mt-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Progress</span>
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
            {completedSets} / {totalSets}
          </span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-2 sm:px-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('routine-overview')}
            className="rounded-full w-12 h-12 glass-panel border-white/10 p-0"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </Button>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{activeSession.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              {typeof window !== 'undefined' && 'wakeLock' in navigator && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">WAKE LOCK ON</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowRestTimer(true)}
          className="w-12 h-12 rounded-full glass-panel border-white/10 bg-blue-600/5"
        >
           <Clock className="w-6 h-6 text-blue-400" />
        </Button>
      </div>

      <div className="grid gap-12">
         {activeSession.exercises.map((exercise) => (
              <div key={exercise.id} className="space-y-6">
                <div className="flex items-center justify-between px-4 sm:px-2">
                  <h3 className="text-xl font-black text-white tracking-tighter uppercase">{exercise.cleanName}</h3>
                  <span className="text-xs font-black text-white/30 uppercase tracking-[0.25em]">
                     {exercise.sets} Sets / {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''} Reps
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {Array.from({ length: exercise.sets }).map((_, setIdx) => (
                      <SetRow
                        key={setIdx}
                        setIdx={setIdx}
                        sessionIdx={activeSessionIdx!}
                        exercise={exercise}
                        isCompleted={!!setCompletion[`${activeSessionIdx}-${exercise.id}-${setIdx}`]?.completed}
                        onComplete={() => handleSetCompletion(activeSessionIdx!, exercise.id, setIdx, exercise.restSeconds, exercise.repsMax)}
                      />
                  ))}
                </div>
              </div>
         ))}
      </div>

      <div className="px-2 sm:px-0">
        <Button
          onClick={() => finishSession()}
          className="w-full active-glass-btn hover:brightness-125 text-white rounded-[2.5rem] py-10 h-auto font-black text-2xl transition-all shadow-2xl flex items-center justify-center gap-6 group mt-10"
        >
          <CheckCircle2 className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
          <span>FINISH WORKOUT</span>
        </Button>
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
    </motion.div>
  );
}
