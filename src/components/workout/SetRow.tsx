'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParsedExercise } from '@/types/workout';

interface SetRowProps {
  setIdx: number;
  sessionIdx: number;
  exercise: ParsedExercise;
  isCompleted: boolean;
  onComplete: () => void;
}

export function SetRow({ setIdx, exercise, isCompleted, onComplete }: SetRowProps) {
  const x = useMotionValue(0);
  const swipeThreshold = 120;

  // Transform values for visual feedback during swipe
  const opacity = useTransform(x, [0, swipeThreshold], [0, 0.4]);
  const scale = useTransform(x, [0, swipeThreshold], [0.95, 1.05]);
  const color = useTransform(x, [0, swipeThreshold], ["rgba(16, 185, 129, 0)", "rgba(16, 185, 129, 0.3)"]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > swipeThreshold && !isCompleted) {
      onComplete();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem]">
      {/* Background layer that appears on swipe */}
      <motion.div
        style={{ backgroundColor: color, opacity }}
        className="absolute inset-0 flex items-center pl-8 transition-colors duration-500"
      >
        <motion.div style={{ scale }}>
          <CheckCircle2 className="w-8 h-8 text-white" />
        </motion.div>
      </motion.div>

      {/* Main draggable set card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: isCompleted ? 0 : swipeThreshold + 40 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative glass-panel rounded-[2rem] p-6 flex items-center justify-between transition-all duration-700 border z-10",
          isCompleted ? "bg-emerald-500/10 border-emerald-500/20 translate-x-2" : "border-white/5 bg-zinc-950/40"
        )}
      >
        <div className="flex items-center gap-6">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all duration-700",
            isCompleted ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-white/5 text-white/20"
          )}>
            {setIdx + 1}
          </div>
          <div>
            <span className={cn(
              "text-lg font-black tracking-tight block leading-none transition-all duration-700",
              isCompleted ? "text-white/40 line-through" : "text-white"
            )}>SET {setIdx + 1}</span>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2 block">
               {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''} Reps
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {!isCompleted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                 <ChevronRight className="w-3 h-3 text-white/20 animate-pulse" />
                 <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">SWIPE</span>
              </div>
           )}
           <div className={cn(
             "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700",
             isCompleted ? "text-emerald-400" : "text-white/5"
           )}>
             {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
           </div>
        </div>
      </motion.div>
    </div>
  );
}
