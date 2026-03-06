'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { HistoryEntry } from '@/types/workout';

interface VolumeBarChartProps {
  history: HistoryEntry[];
  limit: 7 | 30;
  weightUnit: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function VolumeBarChart({ history, limit, weightUnit }: VolumeBarChartProps) {
  const [cutoff, setCutoff] = useState(() => Date.now() - limit * DAY_MS);

  useEffect(() => {
    setCutoff(Date.now() - limit * DAY_MS);
  }, [limit]);

  const entries = useMemo(() => {
    return history
      .filter((e) => new Date(e.completedAt).getTime() >= cutoff)
      .slice()
      .reverse();
  }, [history, cutoff]);
  const maxV = useMemo(() => Math.max(...entries.map((e) => e.totalVolume), 1), [entries]);

  if (entries.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative h-32 flex items-end gap-1">
        {entries.map((entry, i) => {
          const heightPct = entry.totalVolume > 0
            ? Math.max((entry.totalVolume / maxV) * 100, 0)
            : 8; // ghost bar for bodyweight sessions
          const isLast = i === entries.length - 1;
          return (
            <div key={entry.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{ transformOrigin: 'bottom', height: `${heightPct}%` }}
                transition={{ delay: i * 0.05, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className={`w-full rounded-t-lg ${isLast ? 'bg-blue-400' : 'bg-blue-500/60'} ${entry.totalVolume === 0 ? 'opacity-30' : ''}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {entries.map((entry, i) => {
          const showLabel = limit === 7 || i % 5 === 0 || i === entries.length - 1;

          return (
            <div key={entry.id} className="flex-1 text-center">
              {showLabel ? (
                <span className="text-[8px] font-black text-white/20 uppercase">
                  {new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                </span>
              ) : (
                <span aria-hidden className="text-[8px] font-black text-white/0 uppercase">00/00</span>
              )}
            </div>
          );
        })}
      </div>
      {maxV > 0 && (
        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest text-right">
          Peak: {Math.round(maxV).toLocaleString()} {weightUnit}
        </p>
      )}
    </div>
  );
}
