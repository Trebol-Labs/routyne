'use client';

import { motion } from 'framer-motion';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';

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
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter">{entry.sessionTitle}</h4>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                    {new Date(entry.completedAt).toLocaleDateString()} at {new Date(entry.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                  Completed
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                 </div>
                 <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                   {entry.completedExercises.length} Exercises tracked
                 </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
