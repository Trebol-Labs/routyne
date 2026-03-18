'use client';

import type { Bodyweight } from '@/types/workout';

interface BodyWeightChartProps {
  entries: Bodyweight[];
  unit: 'kg' | 'lbs';
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function BodyWeightChart({ entries, unit }: BodyWeightChartProps) {
  const displayed = entries.slice(0, 30).reverse(); // oldest → newest, max 30

  if (displayed.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
          No data yet
        </p>
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

  const values = displayed.map((e) => e.weight);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const W = 320;
  const H = 80;
  const PAD = 8;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const points = displayed.map((e, i) => {
    const x = PAD + (i / (displayed.length - 1)) * innerW;
    const y = PAD + innerH - ((e.weight - minVal) / range) * innerH;
    return { x, y, entry: e };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${points[0].x},${H}`,
    ...points.map((p) => `L ${p.x},${p.y}`),
    `L ${points[points.length - 1].x},${H}`,
    'Z',
  ].join(' ');

  const first = displayed[0].weight;
  const last = displayed[displayed.length - 1].weight;
  const delta = last - first;
  const isUp = delta > 0.05;
  const isDown = delta < -0.05;

  return (
    <div className="space-y-2">
      {/* Chart */}
      <div className="relative w-full overflow-hidden rounded-xl">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: '7rem' }}
          aria-label={`Body weight trend from ${first}${unit} to ${last}${unit}`}
        >
          <defs>
            <linearGradient id="bw-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDown ? '#f97316' : isUp ? '#3b82f6' : '#8b5cf6'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isDown ? '#f97316' : isUp ? '#3b82f6' : '#8b5cf6'} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path d={areaPath} fill="url(#bw-gradient)" />
          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke={isDown ? '#f97316' : isUp ? '#3b82f6' : '#8b5cf6'}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Dots for each point */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill={isDown ? '#f97316' : isUp ? '#3b82f6' : '#8b5cf6'}
              opacity="0.7"
            />
          ))}
          {/* Latest dot — larger */}
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill={isDown ? '#f97316' : isUp ? '#3b82f6' : '#8b5cf6'}
          />
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-white/25">{formatDate(displayed[0].date)}</span>
        {displayed.length > 2 && (
          <span className="text-[9px] font-bold text-white/25">
            {formatDate(displayed[Math.floor(displayed.length / 2)].date)}
          </span>
        )}
        <span className="text-[9px] font-bold text-white/25">{formatDate(displayed[displayed.length - 1].date)}</span>
      </div>

      {/* Delta badge */}
      {displayed.length >= 2 && (
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
      )}
    </div>
  );
}
