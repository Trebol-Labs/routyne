'use client';

import { useMemo, useCallback, useRef, useState } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPRDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatChartLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Chart subcomponent ────────────────────────────────────────────────────────

type ChartMode = 'volume' | '1rm';

interface ProgressChartProps {
  points: ReturnType<typeof getExerciseProgressData>['points'];
  mode: ChartMode;
  weightUnit: 'kg' | 'lbs';
}

function ProgressChart({ points, mode, weightUnit }: ProgressChartProps) {
  const displayed = points.slice(-10);

  if (displayed.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
          Not enough data
        </p>
      </div>
    );
  }

  const values = displayed.map((p) =>
    mode === 'volume' ? p.totalVolume : p.estimatedOneRM,
  );
  const maxVal = Math.max(...values, 1);

  const barColor =
    mode === 'volume'
      ? 'bg-blue-500/60'
      : 'bg-indigo-500/60';

  return (
    <div className="space-y-2">
      {/* Bars */}
      <div className="flex h-28 items-end gap-1.5">
        {displayed.map((p, i) => {
          const val = values[i];
          const heightPct = Math.max(4, Math.round((val / maxVal) * 100));
          return (
            <div
              key={p.date.getTime()}
              className="flex flex-1 flex-col items-center justify-end gap-0.5"
            >
              <div
                className={`w-full rounded-t-sm ${barColor} transition-all duration-500`}
                style={{ height: `${heightPct}%` }}
                title={`${val} ${mode === 'volume' ? weightUnit : weightUnit + ' e1RM'}`}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex items-start gap-1.5">
        {displayed.map((p, i) => {
          const showLabel = i === 0 || i === Math.floor(displayed.length / 2) || i === displayed.length - 1;
          return (
            <div key={p.date.getTime()} className="flex-1 text-center">
              {showLabel && (
                <span className="text-[8px] font-bold text-white/25 leading-none">
                  {formatChartLabel(p.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
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
              Progress History
            </p>
            <h3 className="truncate font-display text-xl font-black uppercase leading-tight tracking-tight text-white">
              {exerciseName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] transition-colors hover:bg-white/10"
            aria-label="Close"
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
                  All-time PR
                </p>
                <p className="mt-0.5 text-sm font-black text-amber-200">
                  {allTimePR.weight}
                  {weightUnit} × {allTimePR.reps} reps
                  <span className="ml-2 text-amber-300/50 font-bold">
                    · {formatPRDate(allTimePR.date)}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
                No data yet — start training!
              </p>
            </div>
          )}

          {/* ── Progress chart ── */}
          <div className="sunken-glass rounded-2xl p-4">
            {/* Chart header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
                  {chartMode === 'volume' ? 'Volume Progress' : 'Est. 1RM'}
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
                  Volume
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
                  Est. 1RM
                </button>
              </div>
            </div>

            <ProgressChart points={points} mode={chartMode} weightUnit={weightUnit} />
          </div>

          {/* ── Recent sessions table ── */}
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
              Recent Sessions
            </p>

            {recentSessions.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">
                  No sessions recorded yet
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
                        {session.setsCompleted} sets · {session.totalVolume}
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
                              {sd.repsDone} reps
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
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}
