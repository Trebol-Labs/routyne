'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import { VolumeBarChart } from '@/components/stats/VolumeBarChart';
import { StreakCalendar } from '@/components/stats/StreakCalendar';
import { PersonalRecordsTable } from '@/components/stats/PersonalRecordsTable';

export function StatsView() {
  const { history, profile } = useWorkoutStore();
  const [limit, setLimit] = useState<7 | 30>(7);

  const totalSessions = history.length;
  const totalVolume = history.reduce((sum, e) => sum + e.totalVolume, 0);
  const totalExercises = history.reduce((sum, e) => sum + e.volumeData.length, 0);

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-10"
    >
      <div className="flex items-center gap-5">
        <div className="w-2 h-10 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
        <h3 className="text-white font-black text-3xl tracking-tighter uppercase font-display">Stats</h3>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel rounded-[2.5rem] p-10 border-white/5 text-center space-y-6">
          <TrendingUp className="w-16 h-16 text-white/5 mx-auto" />
          <div className="space-y-2">
            <p className="text-white/40 font-black text-lg uppercase tracking-tighter">Your stats will appear here</p>
            <p className="text-white/25 text-[11px] font-black uppercase tracking-[0.3em]">Complete a session to start tracking</p>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 w-full">
            {['Total Volume', 'Sessions', 'Exercises'].map((label) => (
              <div key={label} className="px-3 py-2 bg-white/[0.03] border border-white/5 rounded-2xl text-center">
                <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel rounded-[2rem] p-4 border-white/5 text-center space-y-2">
              <p className="text-2xl font-black tracking-tighter font-display text-blue-400">{totalSessions}</p>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Sessions</p>
            </div>
            <div className="glass-panel rounded-[2rem] p-4 border-white/5 text-center space-y-2">
              <p className="text-2xl font-black tracking-tighter font-display text-indigo-400">
                {totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()}${profile.weightUnit}` : '—'}
              </p>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Volume</p>
            </div>
            <div className="glass-panel rounded-[2rem] p-4 border-white/5 text-center space-y-2">
              <p className="text-2xl font-black tracking-tighter font-display text-emerald-400">{totalExercises}</p>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Exercises</p>
            </div>
          </div>

          {/* Streak Calendar */}
          <div className="glass-panel rounded-[2rem] p-4 border-white/5 space-y-3">
            <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.4em]">Activity</p>
            <StreakCalendar history={history} />
          </div>

          {/* Volume Chart */}
          <div className="glass-panel rounded-[2rem] p-4 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.4em]">Volume</p>
              <ToggleGroup
                options={['7d', '30d']}
                value={`${limit}d`}
                onChange={(v) => setLimit(v === '7d' ? 7 : 30)}
                ariaLabel="Chart range"
              />
            </div>
            <VolumeBarChart history={history} limit={limit} weightUnit={profile.weightUnit} />
          </div>

          {/* Personal Records */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.4em] px-1">Personal Records</p>
            <PersonalRecordsTable history={history} weightUnit={profile.weightUnit} />
          </div>

          {/* Recent sessions */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em] px-1">Recent</h4>
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} className="glass-panel rounded-[2rem] p-4 border-white/5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white/70 uppercase tracking-tighter truncate">{entry.sessionTitle}</p>
                  <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.2em] mt-0.5">{entry.volumeData.length} exercises</p>
                </div>
                {entry.totalVolume > 0 && (
                  <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest shrink-0">
                    {entry.totalVolume.toLocaleString()}{profile.weightUnit}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
