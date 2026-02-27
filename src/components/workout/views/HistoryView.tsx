'use client';

import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Dumbbell } from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';

function formatRelativeDate(date: Date): string {
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function HistoryView() {
  const { history } = useWorkoutStore();

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-10"
    >
      <div className="flex items-center gap-5">
         <div className="w-2 h-10 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]" />
         <h3 className="text-white font-black text-3xl tracking-tighter uppercase">
           History
         </h3>
      </div>

      {history.length === 0 ? (
        <div className="py-20 text-center space-y-4 glass-panel rounded-[2.5rem] border-white/5">
           <Calendar className="w-16 h-16 text-white/5 mx-auto" />
           <p className="text-zinc-600 font-black uppercase tracking-widest text-sm">No workouts recorded yet</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {history.map((entry) => (
            <div key={entry.id} className="glass-panel rounded-[2.5rem] p-6 border-white/10 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-3">
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter truncate">
                    {entry.sessionTitle}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                      {formatRelativeDate(new Date(entry.completedAt))}
                    </p>
                    {entry.totalVolume > 0 && (
                      <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                        <Dumbbell className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                          {entry.totalVolume.toLocaleString()} kg
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest shrink-0">
                  Done
                </div>
              </div>

              {/* Exercise pills or fallback count */}
              {entry.volumeData?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {entry.volumeData.slice(0, 4).map((ev) => (
                    <span
                      key={ev.exerciseId}
                      className="bg-white/5 border border-white/[0.05] text-white/40 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest"
                    >
                      {ev.cleanName}
                    </span>
                  ))}
                  {entry.volumeData.length > 4 && (
                    <span className="bg-white/5 border border-white/[0.05] text-white/30 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                      +{entry.volumeData.length - 4}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {entry.completedExercises.length} Exercises tracked
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
