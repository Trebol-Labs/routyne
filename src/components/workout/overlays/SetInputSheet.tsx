'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { Check, X, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressionSuggestion {
  suggestedWeight: number | null;
  suggestedReps: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

interface SetInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (repsDone: number, weight: number | undefined, rpe?: number, rir?: number) => void;
  exerciseName: string;
  setIdx: number;
  targetRepsMax: number;
  lastWeight?: number;
  weightUnit: 'kg' | 'lbs';
  progressionSuggestion?: ProgressionSuggestion | null;
}

const EASE = [0.23, 1, 0.32, 1] as const;
const CLOSE_THRESHOLD = 80;

const RIR_OPTIONS = ['5+', '3', '2', '1', '0'] as const;
type RirOption = (typeof RIR_OPTIONS)[number];

function rpeColor(value: number): string {
  if (value <= 5) return '#4ade80'; // green-400
  if (value <= 7) return '#facc15'; // yellow-400
  if (value <= 9) return '#fb923c'; // orange-400
  return '#f87171'; // red-400
}

export function SetInputSheet({
  onClose,
  onConfirm,
  exerciseName,
  setIdx,
  targetRepsMax,
  lastWeight,
  weightUnit,
  progressionSuggestion,
}: SetInputSheetProps) {
  const [reps, setReps] = useState(String(targetRepsMax));
  const [weight, setWeight] = useState(lastWeight != null ? String(lastWeight) : '');
  const [rpeExpanded, setRpeExpanded] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [rir, setRir] = useState<RirOption | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panOffset = useMotionValue(0);
  const hasLastWeight = lastWeight != null && lastWeight > 0;

  const hasSuggestion =
    progressionSuggestion != null &&
    (progressionSuggestion.suggestedWeight != null || progressionSuggestion.suggestedReps !== targetRepsMax);

  // Lock background scroll while sheet is open
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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
        const h = panelRef.current?.getBoundingClientRect().height ?? 600;
        animate(panOffset, h, { duration: 0.25, ease: EASE }).then(onClose);
      } else {
        animate(panOffset, 0, { type: 'spring', stiffness: 500, damping: 30 });
      }
    },
    [panOffset, onClose],
  );

  const applysuggestion = () => {
    if (!progressionSuggestion) return;
    if (progressionSuggestion.suggestedWeight != null) {
      setWeight(String(progressionSuggestion.suggestedWeight));
    }
    if (progressionSuggestion.suggestedReps !== targetRepsMax) {
      setReps(String(progressionSuggestion.suggestedReps));
    }
  };

  const handleConfirm = () => {
    const repsDone = Math.max(0, parseInt(reps) || 0);
    const weightVal = weight ? parseFloat(weight) : undefined;
    onConfirm(repsDone, weightVal, rpe ?? undefined, rir != null ? Number(rir.replace('+', '')) : undefined);
  };

  const handleSkipWeight = () => {
    onConfirm(parseInt(reps) || targetRepsMax, undefined, rpe ?? undefined, rir != null ? Number(rir.replace('+', '')) : undefined);
  };

  const rpeAccentColor = rpe != null ? rpeColor(rpe) : '#6b7280';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="setinput-backdrop"
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
        key="setinput-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Log set ${setIdx + 1} for ${exerciseName}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, y: panOffset }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        className="z-[var(--z-overlay)] glass-panel rounded-t-3xl border-white/10 overscroll-none touch-pan-x cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        {/* Header row */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4">
          <div className="min-w-0 flex-1 pr-3">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              Set {setIdx + 1}
            </p>
            <h3 className="truncate font-display text-lg font-black uppercase leading-tight tracking-tight text-white">
              {exerciseName}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                {targetRepsMax} reps
              </div>
              {hasLastWeight && (
                <div className="rounded-full border border-sky-400/15 bg-sky-500/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200/85">
                  {lastWeight} {weightUnit} last
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] transition-colors hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>

        {/* Progression suggestion banner */}
        <AnimatePresence>
          {hasSuggestion && progressionSuggestion && (
            <motion.button
              key="suggestion-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={applysuggestion}
              className={cn(
                'mx-5 mb-4 flex w-[calc(100%-2.5rem)] items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98]',
                progressionSuggestion.confidence === 'high'
                  ? 'border-sky-400/20 bg-sky-500/[0.1] hover:bg-sky-500/[0.15]'
                  : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.07]',
              )}
              aria-label={`Apply suggestion: ${progressionSuggestion.reason}`}
            >
              <TrendingUp
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  progressionSuggestion.confidence === 'high' ? 'text-sky-300' : 'text-white/40',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {progressionSuggestion.suggestedWeight != null && (
                    <span
                      className={cn(
                        'text-[11px] font-black uppercase tracking-widest',
                        progressionSuggestion.confidence === 'high' ? 'text-sky-200' : 'text-white/60',
                      )}
                    >
                      {progressionSuggestion.suggestedWeight > (lastWeight ?? 0) && '↑ '}
                      {progressionSuggestion.suggestedWeight} {weightUnit}
                    </span>
                  )}
                  {progressionSuggestion.suggestedReps !== targetRepsMax && (
                    <span
                      className={cn(
                        'text-[11px] font-black uppercase tracking-widest',
                        progressionSuggestion.confidence === 'high' ? 'text-sky-200' : 'text-white/60',
                      )}
                    >
                      {progressionSuggestion.suggestedReps} reps
                    </span>
                  )}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest',
                      progressionSuggestion.confidence === 'high'
                        ? 'bg-sky-400/20 text-sky-300'
                        : progressionSuggestion.confidence === 'medium'
                          ? 'bg-amber-400/15 text-amber-300'
                          : 'bg-white/[0.06] text-white/35',
                    )}
                  >
                    {progressionSuggestion.confidence}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-white/35">
                  {progressionSuggestion.reason}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-[9px] font-black uppercase tracking-widest',
                  progressionSuggestion.confidence === 'high' ? 'text-sky-400/70' : 'text-white/25',
                )}
              >
                Apply
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 px-5 pb-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
              Reps
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="sunken-glass w-full rounded-xl bg-transparent px-3 py-3.5 text-center text-3xl font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              min={0}
              max={999}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
              Weight ({weightUnit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="—"
              className="sunken-glass w-full rounded-xl bg-transparent px-3 py-3.5 text-center text-3xl font-black text-white outline-none placeholder:text-white/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              min={0}
            />
          </div>
        </div>

        {/* Separator */}
        <div className="mx-5 mb-3 h-px bg-white/[0.06]" />

        {/* RPE / RIR section */}
        <div className="px-5 pb-4">
          <button
            onClick={() => setRpeExpanded((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between py-1"
            aria-expanded={rpeExpanded}
            aria-controls="rpe-section"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
              Rate Effort{' '}
              <span className="text-white/18">(Optional)</span>
            </span>
            {rpeExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-white/30" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-white/30" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {rpeExpanded && (
              <motion.div
                id="rpe-section"
                key="rpe-section"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE }}
                style={{ overflow: 'hidden' }}
              >
                <div className="pt-3 space-y-5">
                  {/* RPE slider */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="rpe-slider"
                        className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40"
                      >
                        RPE
                      </label>
                      <span
                        className="text-sm font-black tabular-nums transition-colors"
                        style={{ color: rpeAccentColor }}
                      >
                        {rpe != null ? rpe : '—'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="rpe-slider"
                        type="range"
                        min={1}
                        max={10}
                        step={0.5}
                        value={rpe ?? 7}
                        onChange={(e) => setRpe(parseFloat(e.target.value))}
                        onMouseDown={() => { if (rpe == null) setRpe(7); }}
                        onTouchStart={() => { if (rpe == null) setRpe(7); }}
                        aria-label="RPE — Rate of Perceived Exertion from 1 to 10"
                        aria-valuemin={1}
                        aria-valuemax={10}
                        aria-valuenow={rpe ?? 7}
                        className="w-full h-2 rounded-full cursor-pointer appearance-none bg-white/[0.08] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/20 [&::-moz-range-thumb]:bg-white"
                        style={{ accentColor: rpeAccentColor }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/20">
                      <span>Easy</span>
                      <span>Moderate</span>
                      <span>Max</span>
                    </div>
                    {rpe == null && (
                      <button
                        onClick={() => setRpe(7)}
                        className="w-full text-center text-[10px] font-bold text-white/20 hover:text-white/40 transition-colors"
                      >
                        Tap slider to set RPE
                      </button>
                    )}
                  </div>

                  {/* RIR picker */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                      Reps in Reserve
                    </label>
                    <div className="flex gap-2">
                      {RIR_OPTIONS.map((option) => (
                        <button
                          key={option}
                          onClick={() => setRir((prev) => (prev === option ? null : option))}
                          aria-pressed={rir === option}
                          aria-label={`${option} reps in reserve`}
                          className={cn(
                            'flex-1 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95',
                            rir === option
                              ? 'active-glass-btn text-white'
                              : 'sunken-glass text-white/40 hover:text-white/60',
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="space-y-2 px-5 pb-10">
          <button
            onClick={handleConfirm}
            className={cn(
              'active-glass-btn flex h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-2xl',
              'text-[13px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.98]',
            )}
          >
            <Check className="h-4.5 w-4.5" strokeWidth={2.5} />
            Log Set
          </button>

          <button
            onClick={handleSkipWeight}
            className="h-10 w-full text-[11px] font-bold uppercase tracking-widest text-white/30 transition-colors hover:text-white/50"
          >
            Skip weight
          </button>
        </div>
      </motion.div>
    </>
  );
}
