'use client';

import { Trophy } from 'lucide-react';
import type { PRRow } from '@/hooks/useAnalyticsWorker';

interface PersonalRecordsTableProps {
  prs: PRRow[];
  weightUnit: string;
  loading?: boolean;
}

export function PersonalRecordsTable({ prs: rows, weightUnit, loading }: PersonalRecordsTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-2xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

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
             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
               {row.sessions}x
             </span>
             {row.hasWeightedSet && (
               <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest whitespace-nowrap">
                 {Math.round(row.bestWeight)}{weightUnit}×{row.bestReps}
               </span>
             )}
             {!row.hasWeightedSet && (
               <span className="text-[10px] font-black text-white/35 uppercase tracking-widest whitespace-nowrap">
                 {row.bestBodyweightReps > 0 ? `BW×${row.bestBodyweightReps}` : 'BW'}
               </span>
             )}
           </div>
         </div>
       ))}
    </div>
  );
}
