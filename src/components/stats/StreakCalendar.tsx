'use client';

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { HistoryEntry } from '@/types/workout';
import { cn } from '@/lib/utils';

function computeStreak(workoutDays: Set<string>, restDays: number[]): number {
  const isFulfilled = (d: Date) => workoutDays.has(d.toDateString()) || restDays.includes(d.getDay());
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  let check: Date | null = isFulfilled(today) ? new Date(today) : isFulfilled(yesterday) ? new Date(yesterday) : null;
  if (!check) return 0;
  let streak = 0;
  while (isFulfilled(check)) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

interface StreakCalendarProps {
  history: HistoryEntry[];
  restDays?: number[];
}

export function StreakCalendar({ history, restDays = [] }: StreakCalendarProps) {
  const workoutDays = new Set(history.map((e) => new Date(e.completedAt).toDateString()));
  const streak = computeStreak(workoutDays, restDays);
  const today = new Date();
  const todayStr = today.toDateString();

  // Build 28 days ending today (Mon–Sun alignment)
  const days: Date[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  // Pad to start on Monday
  const firstDow = days[0].getDay(); // 0=Sun..6=Sat
  const padStart = firstDow === 0 ? 6 : firstDow - 1; // days to pad before first cell
  const allCells: (Date | null)[] = [
    ...Array.from({ length: padStart }, () => null),
    ...days,
  ];

  return (
    <div className="space-y-3">
       <div className="flex items-center gap-2">
         <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
         <span className="text-sm font-black text-emerald-400 font-display">{streak}</span>
         <span className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">day streak</span>
       </div>
       <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
         {['M','T','W','T','F','S','S'].map((d, i) => (
           <div key={i} className="text-center text-[7px] sm:text-[8px] font-black text-white/20 uppercase pb-0.5 sm:pb-1">{d}</div>
         ))}
        {allCells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;
          const isWorkout = workoutDays.has(day.toDateString());
          const isRestDay = !isWorkout && restDays.includes(day.getDay());
          const isToday = day.toDateString() === todayStr;
          return (
            <motion.div
              key={day.toDateString()}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.008 }}
              className={cn(
                'aspect-square rounded-lg',
                isWorkout
                  ? 'bg-blue-500/60 border border-blue-500/30'
                  : isRestDay
                    ? 'bg-purple-500/25 border border-purple-500/20'
                    : 'bg-white/5 border border-white/5',
                isToday && 'ring-1 ring-white/30'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
