'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { HistoryEntry } from '@/types/workout';

interface VolumeBarChartProps {
  history: HistoryEntry[];
  limit: 7 | 30;
  weightUnit: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface ChartPoint {
  id: string;
  date: string;
  volume: number;
  weightUnit: string;
  isLast: boolean;
}

function VolumeTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-xl border border-white/10 bg-black/85 backdrop-blur-sm px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-white/40">{pt.date}</p>
      {pt.volume > 0 ? (
        <p className="mt-0.5 text-xs font-black text-blue-300">
          {Math.round(pt.volume).toLocaleString()} {pt.weightUnit}
        </p>
      ) : (
        <p className="mt-0.5 text-xs font-black text-white/40">BW session</p>
      )}
    </div>
  );
}

export function VolumeBarChart({ history, limit, weightUnit }: VolumeBarChartProps) {
  const [cutoff, setCutoff] = useState(() => Date.now() - limit * DAY_MS);

  useEffect(() => {
    setCutoff(Date.now() - limit * DAY_MS);
  }, [limit]);

  const data = useMemo<ChartPoint[]>(() => {
    const filtered = history
      .filter((e) => new Date(e.completedAt).getTime() >= cutoff)
      .slice()
      .reverse();
    return filtered.map((entry, i) => ({
      id: entry.id,
      date: new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      volume: entry.totalVolume,
      weightUnit,
      isLast: i === filtered.length - 1,
    }));
  }, [history, cutoff, weightUnit]);

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/35">No data yet</p>
      </div>
    );
  }

  const maxV = Math.max(...data.map((d) => d.volume), 1);
  const tickInterval = limit === 7 ? 0 : Math.max(0, Math.floor(data.length / 6) - 1);

  return (
    <div className="space-y-1">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)', fontWeight: 900 }}
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis hide domain={[0, maxV * 1.15]} />
          <Tooltip
            content={VolumeTooltip}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="volume" radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={
                  entry.volume === 0
                    ? 'rgba(255,255,255,0.08)'
                    : entry.isLast
                      ? 'rgba(96,165,250,0.9)'
                      : 'rgba(59,130,246,0.55)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {maxV > 0 && (
        <p className="text-right text-[9px] font-black uppercase tracking-widest text-white/25">
          Peak: {Math.round(maxV).toLocaleString()} {weightUnit}
        </p>
      )}
    </div>
  );
}
