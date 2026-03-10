'use client';

import { useMemo, useState } from 'react';
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
  const totalExercises = useMemo(() => {
    const uniqueNames = new Set<string>();
    for (const entry of history) {
      for (const volumeEntry of entry.volumeData) {
        uniqueNames.add(volumeEntry.cleanName.toLowerCase());
      }
    }
    return uniqueNames.size;
  }, [history]);

  const sectionLabelClassName = 'text-[10px] font-black text-white/25 uppercase tracking-[0.4em]';
  const summaryCards = [
    {
      label: 'Sessions',
      value: totalSessions.toLocaleString(),
      valueClassName: 'text-blue-400',
    },
    {
      label: 'Volume',
      value: totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()}${profile.weightUnit}` : '—',
      valueClassName: 'text-indigo-400',
    },
    {
      label: 'Exercises',
      value: totalExercises.toLocaleString(),
      valueClassName: 'text-emerald-400',
    },
  ];

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-8 px-4 pb-6"
    >
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="w-2 h-10 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
        <h3 className="text-white font-black text-2xl sm:text-3xl tracking-tighter uppercase font-display">Stats</h3>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel rounded-[var(--radius-xl)] border-white/5 px-6 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center space-y-8">
            <TrendingUp className="w-16 h-16 text-white/5" />
            <div className="space-y-2">
              <p className="text-white/40 font-black text-lg uppercase tracking-tighter">Your stats will appear here</p>
              <p className="text-white/25 text-[11px] font-black uppercase tracking-[0.3em]">Complete a session to start tracking</p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="space-y-1.5 rounded-[var(--radius-md)] bg-white/[0.03] border border-white/5 px-2 py-3 sm:px-3 sm:py-4 text-center">
                  <p className="text-lg sm:text-xl font-black tracking-tighter font-display text-white/15">—</p>
                  <p className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest line-clamp-2">{card.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="glass-panel rounded-[var(--radius-lg)] p-3 sm:p-4 md:p-5 border-white/5 text-center space-y-1.5 sm:space-y-2">
                <p className={`text-lg sm:text-xl md:text-2xl font-black tracking-tighter font-display truncate ${card.valueClassName}`}>{card.value}</p>
                <p className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest line-clamp-2">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Streak Calendar */}
          <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-3">
            <p className={sectionLabelClassName}>Activity</p>
            <StreakCalendar history={history} restDays={profile.restDays ?? []} />
          </div>

          {/* Volume Chart */}
          <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <p className={sectionLabelClassName}>Volume</p>
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
          <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-4">
            <p className={sectionLabelClassName}>Personal Records</p>
            <PersonalRecordsTable history={history} weightUnit={profile.weightUnit} />
          </div>

          {/* Recent sessions */}
          <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-3">
            <p className={sectionLabelClassName}>Recent Sessions</p>
             {history.slice(0, 5).map((entry) => (
               <div key={entry.id} className="rounded-[var(--radius-md)] bg-white/[0.03] border border-white/[0.05] px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
                 <div className="min-w-0">
                   <p className="text-xs sm:text-sm font-black text-white/70 uppercase tracking-tighter truncate">{entry.sessionTitle}</p>
                   <p className="text-[8px] sm:text-[10px] font-black text-white/25 uppercase tracking-[0.2em] mt-0.5">{entry.volumeData.length} ex.</p>
                 </div>
                 <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest shrink-0 whitespace-nowrap ${entry.totalVolume > 0 ? 'text-blue-400/60' : 'text-white/25'}`}>
                   {entry.totalVolume > 0 ? `${entry.totalVolume.toLocaleString()}${profile.weightUnit}` : 'BW'}
                 </span>
               </div>
             ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
