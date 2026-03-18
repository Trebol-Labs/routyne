'use client';

import type { MuscleGroupVolume } from '@/lib/analytics/muscle-map';

interface MuscleGroupChartProps {
  data: MuscleGroupVolume[];
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#3b82f6',
  back: '#8b5cf6',
  shoulders: '#06b6d4',
  biceps: '#f59e0b',
  triceps: '#f97316',
  core: '#10b981',
  quads: '#ec4899',
  hamstrings: '#a855f7',
  glutes: '#ef4444',
  calves: '#22c55e',
  forearms: '#84cc16',
};

export function MuscleGroupChart({ data }: MuscleGroupChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
          No data this week
        </p>
      </div>
    );
  }

  const totalSets = data.reduce((s, d) => s + d.sets, 0);

  return (
    <div className="space-y-2.5">
      {data.slice(0, 6).map(({ muscle, sets }) => {
        const pct = totalSets > 0 ? (sets / totalSets) * 100 : 0;
        const color = MUSCLE_COLORS[muscle] ?? '#6b7280';
        return (
          <div key={muscle} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 capitalize">
                {muscle}
              </span>
              <span className="text-[10px] font-black text-white/40">
                {sets} {sets === 1 ? 'set' : 'sets'} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
