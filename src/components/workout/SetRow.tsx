'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParsedExercise } from '@/types/workout';
import { useRef, useEffect } from 'react';
import { pulseGlow } from '@/lib/animations';

interface SetRowProps {
  setIdx: number;
  sessionIdx: number;
  exercise: ParsedExercise;
  isCompleted: boolean;
  onRequestComplete: () => void;
}

export function SetRow({ setIdx, exercise, isCompleted, onRequestComplete }: SetRowProps) {
  const x = useMotionValue(0);
  const swipeThreshold = 120;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCompleted && cardRef.current) {
      pulseGlow(cardRef.current);
    }
  }, [isCompleted]);

  // Transform values for visual feedback during swipe
  const opacity = useTransform(x, [0, swipeThreshold], [0, 0.4]);
  const scale = useTransform(x, [0, swipeThreshold], [0.95, 1.05]);
  const color = useTransform(x, [0, swipeThreshold], ["rgba(16, 185, 129, 0)", "rgba(16, 185, 129, 0.3)"]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const pastPositionThreshold = info.offset.x > swipeThreshold;
    const fastFlick = info.velocity.x > 500; // px/s — completes even on short fast flick
    if ((pastPositionThreshold || fastFlick) && !isCompleted) {
      if ('vibrate' in navigator) navigator.vibrate(50);
      onRequestComplete();
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
        ref={cardRef}
        drag="x"
        dragConstraints={{ left: 0, right: isCompleted ? 0 : swipeThreshold + 40 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative glass-panel rounded-[1.5rem] p-4 flex items-center justify-between transition-all duration-500 border z-10",
          isCompleted ? "bg-emerald-500/10 border-emerald-500/20 translate-x-2" : "border-white/5 bg-zinc-950/40"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center font-black transition-all duration-500 font-display text-sm",
            isCompleted ? "bg-emerald-500 text-white" : "bg-white/5 text-white/30"
          )}>
            {setIdx + 1}
          </div>
          <div>
            <span className={cn(
              "text-base font-black tracking-tight block leading-none transition-all duration-500 font-display",
              isCompleted ? "text-white/40 line-through" : "text-white"
            )}>SET {setIdx + 1}</span>
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1 block">
               {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''} Reps
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {!isCompleted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                 <ChevronRight className="w-3 h-3 text-white/20 animate-pulse" />
                 <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">SWIPE</span>
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
