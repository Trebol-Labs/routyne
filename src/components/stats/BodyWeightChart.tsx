'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { Bodyweight } from '@/types/workout';

interface BodyWeightChartProps {
  entries: Bodyweight[];
  unit: 'kg' | 'lbs';
}

interface ChartPoint {
  date: string;
  weight: number;
  unit: string;
}

function BWTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-xl border border-white/10 bg-black/85 backdrop-blur-sm px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-white/40">{pt.date}</p>
      <p className="mt-0.5 text-xs font-black text-white/80">
        {pt.weight} {pt.unit}
      </p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function BodyWeightChart({ entries, unit }: BodyWeightChartProps) {
  const displayed = entries.slice(0, 30).reverse();

  if (displayed.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">No data yet</p>
      </div>
    );
  }

  if (displayed.length === 1) {
    return (
      <div className="flex h-28 items-center justify-center">
        <p className="text-sm font-black text-white/70">
          {displayed[0].weight} {unit}
        </p>
      </div>
    );
  }

  const data: ChartPoint[] = displayed.map((e) => ({
    date: formatDate(e.date),
    weight: e.weight,
    unit,
  }));

  const first = displayed[0].weight;
  const last = displayed[displayed.length - 1].weight;
  const delta = last - first;
  const isUp = delta > 0.05;
  const isDown = delta < -0.05;
  const color = isDown ? '#f97316' : isUp ? '#3b82f6' : '#8b5cf6';
  const gradientId = `bw-fill-${isDown ? 'dn' : isUp ? 'up' : 'fl'}`;

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const padding = Math.max((maxW - minW) * 0.3, 0.5);

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={112}>
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)', fontWeight: 900 }}
            axisLine={false}
            tickLine={false}
            interval={displayed.length <= 7 ? 0 : Math.floor(displayed.length / 4)}
          />
          <YAxis hide domain={[minW - padding, maxW + padding]} />
          <Tooltip content={BWTooltip} cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }} />
          <Area
            type="monotone"
            dataKey="weight"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Delta badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-white/70">
          Latest: {last} {unit}
        </span>
        {Math.abs(delta) > 0.05 && (
          <span className={`text-[10px] font-black ${isUp ? 'text-blue-400' : 'text-orange-400'}`}>
            {isUp ? '+' : ''}{delta.toFixed(1)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
