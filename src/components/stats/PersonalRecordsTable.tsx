'use client';

import { useMemo } from 'react';
import { HistoryEntry } from '@/types/workout';
import { Trophy } from 'lucide-react';

interface PRRow {
  cleanName: string;
  sessions: number;
  maxVolume: number;
}

interface PersonalRecordsTableProps {
  history: HistoryEntry[];
  weightUnit: string;
}

export function PersonalRecordsTable({ history, weightUnit }: PersonalRecordsTableProps) {
  const rows = useMemo(() => {
    const prMap = new Map<string, PRRow>();
    for (const entry of history) {
      for (const ev of entry.volumeData) {
        const existing = prMap.get(ev.cleanName);
        if (!existing) {
          prMap.set(ev.cleanName, {
            cleanName: ev.cleanName,
            sessions: 1,
            maxVolume: ev.totalVolume,
          });
        } else {
          existing.sessions += 1;
          if (ev.totalVolume > existing.maxVolume) existing.maxVolume = ev.totalVolume;
        }
      }
    }
    return Array.from(prMap.values()).sort((a, b) => b.sessions - a.sessions);
  }, [history]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.cleanName}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]"
        >
          <Trophy className="w-4 h-4 text-yellow-500/60 shrink-0" />
          <p className="text-sm font-black text-white/70 uppercase tracking-tight truncate flex-1">{row.cleanName}</p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-black text-white/25 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full">
              {row.sessions}x
            </span>
            {row.maxVolume > 0 && (
              <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest">
                {Math.round(row.maxVolume).toLocaleString()}{weightUnit}
              </span>
            )}
            {row.maxVolume === 0 && (
              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">BW</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
