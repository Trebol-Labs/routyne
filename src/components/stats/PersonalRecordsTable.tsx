'use client';

import { useMemo } from 'react';
import { HistoryEntry } from '@/types/workout';
import { Trophy } from 'lucide-react';

interface PRRow {
  cleanName: string;
  sessions: number;
  bestSetVolume: number;
  bestWeight: number;
  bestReps: number;
  bestBodyweightReps: number;
  hasWeightedSet: boolean;
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
            bestSetVolume: 0,
            bestWeight: 0,
            bestReps: 0,
            bestBodyweightReps: 0,
            hasWeightedSet: false,
          });
        } else {
          existing.sessions += 1;
        }

        const row = prMap.get(ev.cleanName);
        if (!row) {
          continue;
        }

        for (const setDetail of ev.setDetails ?? []) {
          const repsDone = setDetail.repsDone ?? 0;
          const weight = setDetail.weight ?? 0;

          if (repsDone <= 0) {
            continue;
          }

          if (weight > 0) {
            const weightedScore = weight * repsDone;
            if (weightedScore > row.bestSetVolume) {
              row.bestSetVolume = weightedScore;
              row.bestWeight = weight;
              row.bestReps = repsDone;
              row.hasWeightedSet = true;
            }
          } else if (repsDone > row.bestBodyweightReps) {
            row.bestBodyweightReps = repsDone;
          }
        }
      }
    }

    return Array.from(prMap.values()).sort((a, b) => {
      if (a.hasWeightedSet !== b.hasWeightedSet) {
        return Number(b.hasWeightedSet) - Number(a.hasWeightedSet);
      }

      if (a.hasWeightedSet && b.hasWeightedSet) {
        if (b.bestSetVolume !== a.bestSetVolume) {
          return b.bestSetVolume - a.bestSetVolume;
        }

        if (b.bestWeight !== a.bestWeight) {
          return b.bestWeight - a.bestWeight;
        }
      }

      if (b.bestBodyweightReps !== a.bestBodyweightReps) {
        return b.bestBodyweightReps - a.bestBodyweightReps;
      }

      return b.sessions - a.sessions;
    });
  }, [history]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
       {rows.map((row) => (
         <div
           key={row.cleanName}
           className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]"
         >
           <Trophy className="w-3 sm:w-4 h-3 sm:h-4 text-yellow-500/60 shrink-0" />
           <p className="text-xs sm:text-sm font-black text-white/70 uppercase tracking-tight truncate flex-1">{row.cleanName}</p>
           <div className="flex items-center gap-1 sm:gap-2 shrink-0 text-right">
             <span className="text-[8px] sm:text-[9px] font-black text-white/25 uppercase tracking-widest bg-white/5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
               {row.sessions}x
             </span>
             {row.hasWeightedSet && (
               <span className="text-[8px] sm:text-[9px] font-black text-blue-400/60 uppercase tracking-widest whitespace-nowrap">
                 {Math.round(row.bestWeight)}{weightUnit}×{row.bestReps}
               </span>
             )}
             {!row.hasWeightedSet && (
               <span className="text-[8px] sm:text-[9px] font-black text-white/20 uppercase tracking-widest whitespace-nowrap">
                 {row.bestBodyweightReps > 0 ? `BW×${row.bestBodyweightReps}` : 'BW'}
               </span>
             )}
           </div>
         </div>
       ))}
    </div>
  );
}
