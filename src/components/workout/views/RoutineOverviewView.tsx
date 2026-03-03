'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { Play, LayoutGrid, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RoutineOverviewView() {
  const { currentRoutine, startSession } = useWorkoutStore();
  const [sessionPickerIdx, setSessionPickerIdx] = useState(0);

  if (!currentRoutine) return null;

  const pickerSession = currentRoutine.sessions[sessionPickerIdx];

  return (
    <motion.div
      key="routine"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Routine Hero Section */}
      <div className="space-y-4 relative group">
        <div className="relative p-5 sm:p-8 rounded-[2.5rem] glass-panel border border-white/10 overflow-hidden">
          <div className="absolute top-[-40px] right-[-40px] opacity-[0.04] pointer-events-none">
             <Dumbbell className="w-48 h-48 text-white" />
          </div>

          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/8 rounded-full">
               <LayoutGrid className="w-3.5 h-3.5 text-white/40" />
               <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em]">{currentRoutine.sessions.length} Sessions · {pickerSession?.exercises.length} Exercises</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white leading-[0.95] uppercase font-display">
                {currentRoutine.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Horizontal Session Picker */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black text-white/25 uppercase tracking-[0.4em] pl-1 font-display">Sessions</h3>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:-mx-2 sm:px-2">
            {currentRoutine.sessions.map((session, idx) => (
              <button
                key={session.id}
                onClick={() => setSessionPickerIdx(idx)}
                className={cn(
                  "shrink-0 relative flex flex-col items-center justify-center min-w-[100px] h-[110px] rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  sessionPickerIdx === idx
                    ? "active-glass-btn scale-[1.03] -translate-y-1 z-10"
                    : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.12]"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 mb-2",
                  sessionPickerIdx === idx ? "bg-white/20" : "bg-white/8"
                )}>
                   <span className={cn(
                     "text-base font-black tracking-tighter font-display",
                     sessionPickerIdx === idx ? "text-white" : "text-white/40"
                   )}>{idx + 1}</span>
                </div>

                <h4 className={cn(
                  "text-[10px] font-black tracking-[0.2em] uppercase leading-none",
                  sessionPickerIdx === idx ? "text-white/80" : "text-white/40"
                )}>
                  Day
                </h4>

                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest mt-1",
                  sessionPickerIdx === idx ? "text-white/40" : "text-white/20"
                )}>
                  {session.exercises.length}ex
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="glass-primary"
          size="xl"
          onClick={() => startSession(sessionPickerIdx)}
          className="w-full rounded-[2rem] gap-3 group"
        >
          <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
          START SESSION {sessionPickerIdx + 1}
        </Button>
      </div>

      {/* Exercises Sequence Overview */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1 h-6 bg-blue-500 rounded-full" />
          <h3 className="text-white font-black text-xl tracking-tighter uppercase font-display">
            Sequence
          </h3>
        </div>

        <div className="grid gap-3 px-2 sm:px-0">
          {pickerSession?.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
