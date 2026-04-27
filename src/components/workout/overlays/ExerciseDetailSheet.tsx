'use client';

import { useMemo, useCallback, useRef, useState } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import {
  getExerciseProgressData,
  getRecentExerciseSessions,
} from '@/lib/analytics/exercise-history';
import type { HistoryEntry } from '@/types/workout';

// ── Constants ─────────────────────────────────────────────────────────────────

const EASE = [0.23, 1, 0.32, 1] as const;
const CLOSE_THRESHOLD = 80;

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExerciseDetailSheetProps {
  exerciseName: string;
  history: HistoryEntry[];
  weightUnit: 'kg' | 'lbs';
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 14) return 'La semana pasada';
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function formatPRDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

function formatChartLabel(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

// ── Chart subcomponent ────────────────────────────────────────────────────────

type ChartMode = 'volume' | '1rm';

interface ProgressChartProps {
  points: ReturnType<typeof getExerciseProgressData>['points'];
  mode: ChartMode;
  weightUnit: 'kg' | 'lbs';
}

interface ProgressChartPoint {
  label: string;
  volume: number;
  oneRM: number;
  weightUnit: string;
  modeLabel: string;
}

function ProgressTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as ProgressChartPoint;
  return (
    <div className="rounded-xl border border-white/10 bg-black/85 backdrop-blur-sm px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-white/40">{pt.label}</p>
      <p className="mt-0.5 text-xs font-black text-indigo-300">
        {Math.round(payload[0].value as number).toLocaleString()} {pt.weightUnit} {pt.modeLabel}
      </p>
    </div>
  );
}

function ProgressChart({ points, mode, weightUnit }: ProgressChartProps) {
  const displayed = points.slice(-12);

  if (displayed.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
          Faltan datos
        </p>
      </div>
    );
  }

  const data: ProgressChartPoint[] = displayed.map((p) => ({
    label: formatChartLabel(p.date),
    volume: Math.round(p.totalVolume),
    oneRM: Math.round(p.estimatedOneRM),
    weightUnit,
    modeLabel: mode === 'volume' ? '' : '1RM',
  }));

  const dataKey = mode === 'volume' ? 'volume' : 'oneRM';
  const color = mode === 'volume' ? '#60a5fa' : '#818cf8';
  const gradientId = `progress-fill-${mode}`;

  const values = data.map((d) => (mode === 'volume' ? d.volume : d.oneRM));
  const minV = Math.min(...values);
  const maxV = Math.max(...values, 1);
  const padding = Math.max((maxV - minV) * 0.25, 1);

  return (
    <ResponsiveContainer width="100%" height={112}>
      <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)', fontWeight: 900 }}
          axisLine={false}
          tickLine={false}
          interval={Math.max(0, Math.floor(displayed.length / 4) - 1)}
        />
        <YAxis hide domain={[minV - padding, maxV + padding]} />
        <Tooltip content={ProgressTooltip} cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ExerciseDetailSheet({
  exerciseName,
  history,
  weightUnit,
  onClose,
}: ExerciseDetailSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const panOffset = useMotionValue(0);
  const [chartMode, setChartMode] = useState<ChartMode>('volume');

  const progressData = useMemo(
    () => getExerciseProgressData(exerciseName, history),
    [exerciseName, history],
  );

  const recentSessions = useMemo(
    () => getRecentExerciseSessions(exerciseName, history, 4),
    [exerciseName, history],
  );

  // Drag-to-close (downward swipe)
  const handlePan = useCallback(
    (_e: PointerEvent, info: PanInfo) => {
      panOffset.set(Math.max(0, info.offset.y));
    },
    [panOffset],
  );

  const handlePanEnd = useCallback(
    (_e: PointerEvent, info: PanInfo) => {
      if (info.offset.y > CLOSE_THRESHOLD || info.velocity.y > 500) {
        const h = panelRef.current?.getBoundingClientRect().height ?? 700;
        animate(panOffset, h, { duration: 0.25, ease: EASE }).then(onClose);
      } else {
        animate(panOffset, 0, { type: 'spring', stiffness: 500, damping: 30 });
      }
    },
    [panOffset, onClose],
  );

  const { allTimePR, recentTrend, points } = progressData;

  const TrendIcon =
    recentTrend === 'up'
      ? TrendingUp
      : recentTrend === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    recentTrend === 'up'
      ? 'text-emerald-400'
      : recentTrend === 'down'
        ? 'text-red-400'
        : 'text-white/35';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="exercisedetail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/60 backdrop-blur-sm touch-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        key="exercisedetail-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Progress history for ${exerciseName}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, y: panOffset }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        className="z-[var(--z-overlay)] glass-panel rounded-t-3xl border-white/10 overscroll-none touch-pan-x cursor-grab active:cursor-grabbing max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        {/* ── Header row ── */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4">
          <div className="min-w-0 flex-1 pr-3">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              Historial de progreso
            </p>
            <h3 className="truncate font-display text-xl font-black uppercase leading-tight tracking-tight text-white">
              {exerciseName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] transition-colors hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>

        <div className="space-y-4 px-5 pb-6">
          {/* ── All-time PR badge ── */}
          {allTimePR ? (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3">
              <span className="text-xl leading-none" aria-hidden="true">🏆</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300/60">
                  PR histórico
                </p>
                <p className="mt-0.5 text-sm font-black text-amber-200">
                  {allTimePR.weight}
                  {weightUnit} × {allTimePR.reps} repeticiones
                  <span className="ml-2 text-amber-300/50 font-bold">
                    · {formatPRDate(allTimePR.date)}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
                Aún no hay datos. Empieza a entrenar.
              </p>
            </div>
          )}

          {/* ── Progress chart ── */}
          <div className="sunken-glass rounded-2xl p-4">
            {/* Chart header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
                  {chartMode === 'volume' ? 'Progreso de volumen' : '1RM estimado'}
                </p>
                <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} aria-hidden="true" />
              </div>

              {/* Mode toggle pills */}
              <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.04] p-1">
                <button
                  onClick={() => setChartMode('volume')}
                  className={[
                    'rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all',
                    chartMode === 'volume'
                      ? 'bg-blue-500/30 text-blue-200'
                      : 'text-white/30 hover:text-white/50',
                  ].join(' ')}
                >
                  Volumen
                </button>
                <button
                  onClick={() => setChartMode('1rm')}
                  className={[
                    'rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all',
                    chartMode === '1rm'
                      ? 'bg-indigo-500/30 text-indigo-200'
                      : 'text-white/30 hover:text-white/50',
                  ].join(' ')}
                >
                  1RM estimado
                </button>
              </div>
            </div>

            <ProgressChart points={points} mode={chartMode} weightUnit={weightUnit} />
          </div>

          {/* ── Recent sessions table ── */}
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
              Sesiones recientes
            </p>

            {recentSessions.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
                  Aún no hay sesiones registradas
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    {/* Row: date + session title / volume chip */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-white/35">
                          {relativeDate(session.date)}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-bold text-white/70">
                          {session.sessionTitle}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/55 whitespace-nowrap">
                        {session.setsCompleted} series · {session.totalVolume}
                        {weightUnit}
                      </div>
                    </div>

                    {/* Per-set detail chips */}
                    {session.setDetails.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {session.setDetails.map((sd, si) => (
                          sd.weight != null && sd.weight > 0 ? (
                            <span
                              key={si}
                              className="rounded-full border border-sky-400/15 bg-sky-500/[0.08] px-2 py-0.5 text-[10px] font-bold text-sky-200/70"
                            >
                              {sd.repsDone} @ {sd.weight}
                              {weightUnit}
                            </span>
                          ) : (
                            <span
                              key={si}
                              className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-white/40"
                            >
                              {sd.repsDone} repeticiones
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Close button ── */}
          <button
            onClick={onClose}
            className="active-glass-btn flex h-[3.25rem] w-full items-center justify-center rounded-2xl text-[13px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.98]"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </>
  );
}
