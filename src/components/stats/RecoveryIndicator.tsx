'use client';

import type { MuscleGroupVolume } from '@/lib/analytics/muscle-map';

interface RecoveryIndicatorProps {
  data: MuscleGroupVolume[];
}

type Status = 'green' | 'yellow' | 'red';

function getRecoveryStatus(lastTrainedAt: Date | null): Status {
  if (!lastTrainedAt) return 'green';
  const hoursAgo = (Date.now() - lastTrainedAt.getTime()) / 3_600_000;
  if (hoursAgo >= 72) return 'green';
  if (hoursAgo >= 48) return 'yellow';
  return 'red';
}

const STATUS_CONFIG: Record<Status, { bg: string; text: string; label: string }> = {
  green:  { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400', label: 'Ready' },
  yellow: { bg: 'bg-amber-500/20 border-amber-500/30',   text: 'text-amber-400',   label: 'Recovering' },
  red:    { bg: 'bg-red-500/20 border-red-500/30',        text: 'text-red-400',     label: 'Fatigued' },
};

export function RecoveryIndicator({ data }: RecoveryIndicatorProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
          Train to see recovery status
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {data.slice(0, 8).map(({ muscle, lastTrainedAt }) => {
        const status = getRecoveryStatus(lastTrainedAt);
        const { bg, text, label } = STATUS_CONFIG[status];
        return (
          <div
            key={muscle}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${bg}`}
            title={lastTrainedAt
              ? `Last trained: ${lastTrainedAt.toLocaleDateString()}`
              : 'Not trained recently'}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${
              status === 'green' ? 'bg-emerald-400' :
              status === 'yellow' ? 'bg-amber-400' : 'bg-red-400'
            }`} />
            <span className={`text-[9px] font-black uppercase tracking-widest capitalize ${text}`}>
              {muscle}
            </span>
            <span className={`text-[8px] font-bold ${text} opacity-60`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
