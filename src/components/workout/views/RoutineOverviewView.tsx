'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  Play,
  Clock,
  LayoutGrid,
  TrendingUp,
  MoreVertical,
  Dumbbell,
} from 'lucide-react';
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
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="space-y-16"
    >
      {/* Routine Hero Section */}
      <div className="space-y-10">
        <div className="relative group p-10 rounded-[3rem] glass-panel border border-white/10 overflow-hidden shadow-2xl">
          <div className="absolute top-[-50px] right-[-50px] p-6 opacity-5 group-hover:opacity-20 transition-all duration-1000 scale-150 group-hover:rotate-45">
             <Dumbbell className="w-64 h-64 text-white" />
          </div>

          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
               <TrendingUp className="w-4 h-4 text-blue-400" />
               <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.25em]">Hypertrophy Engine</span>
            </div>

            <div className="space-y-4 text-center">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-liquid leading-[0.9] uppercase">
                {currentRoutine.title}
              </h1>
              <p className="text-white/40 text-lg font-bold tracking-tight px-4">
                {currentRoutine.sessions.length} training cycles synchronized.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6">
               <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-[1.5rem] border border-white/5 shadow-inner">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-black text-white/80 uppercase tracking-widest">75m EST</span>
               </div>
               <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-[1.5rem] border border-white/5 shadow-inner">
                  <LayoutGrid className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-black text-white/80 uppercase tracking-widest">{pickerSession?.exercises.length} EXERCISES</span>
               </div>
            </div>
          </div>
        </div>

        {/* Horizontal Session Picker */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4 sm:px-2">
             <h3 className="text-[12px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Phases</h3>
             <button className="text-white/10 hover:text-white transition-all" title="More options">
                <MoreVertical className="w-5 h-5" />
button             </button>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 sm:-mx-2 sm:px-2 pt-2">
            {currentRoutine.sessions.map((session, idx) => (
              <button
                key={session.id}
                onClick={() => setSessionPickerIdx(idx)}
                className={cn(
                  "shrink-0 relative group flex flex-col items-center justify-center min-w-[120px] h-[150px] rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  sessionPickerIdx === idx
                    ? "glass-panel active-glass-btn scale-[1.05] -translate-y-2 z-10"
                    : "bg-white/5 border-white/[0.03] text-white/20 hover:border-white/10 hover:bg-white/[0.08]"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-2xl mb-4",
                  sessionPickerIdx === idx ? "bg-white/20 scale-110" : "bg-black/30"
                )}>
                   <span className={cn(
                     "text-lg font-black tracking-tighter",
                     sessionPickerIdx === idx ? "text-white" : "text-white/10"
                   )}>{idx + 1}</span>
                </div>

                <h4 className={cn(
                  "text-xs font-black tracking-[0.2em] uppercase leading-none",
                  sessionPickerIdx === idx ? "text-white/80" : "text-white/10"
                )}>
                  Day
                </h4>

                {sessionPickerIdx === idx && (
                   <motion.div
                     layoutId="activePickerIndicator"
                     className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white shadow-[0_0_20px_white] border-2 border-blue-500 z-50"
                   />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-2">
          <Button
            onClick={() => startSession(sessionPickerIdx)}
            className="w-full active-glass-btn hover:brightness-125 text-white rounded-[2.5rem] py-10 h-auto font-black text-2xl shadow-[0_20px_60px_-15px_rgba(59,130,246,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-6 group"
          >
            <Play className="w-8 h-8 fill-white group-hover:scale-110 transition-transform" />
            <span>START SESSION {sessionPickerIdx + 1}</span>
          </Button>
        </div>
      </div>

      {/* Exercises Sequence Overview */}
      <div className="space-y-12 pt-10">
        <div className="flex items-center justify-between px-4 sm:px-2">
          <div className="flex items-center gap-5">
             <div className="w-2 h-10 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
             <h3 className="text-white font-black text-3xl tracking-tighter uppercase">
               Sequence
             </h3>
          </div>
        </div>

        <div className="grid gap-8 px-2 sm:px-0">
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
