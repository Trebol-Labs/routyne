'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (repsDone: number, weight: number | undefined) => void;
  exerciseName: string;
  setIdx: number;
  targetRepsMax: number;
  lastWeight?: number;
  weightUnit: 'kg' | 'lbs';
}

const EASE = [0.23, 1, 0.32, 1] as const;
const CLOSE_THRESHOLD = 80;

export function SetInputSheet({
  onClose,
  onConfirm,
  exerciseName,
  setIdx,
  targetRepsMax,
  lastWeight,
  weightUnit,
}: SetInputSheetProps) {
  const [reps, setReps] = useState(String(targetRepsMax));
  const [weight, setWeight] = useState(lastWeight != null ? String(lastWeight) : '');
  const panelRef = useRef<HTMLDivElement>(null);
  const panOffset = useMotionValue(0);
  const hasLastWeight = lastWeight != null && lastWeight > 0;

  // Lock background scroll while sheet is open
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, []);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Drag-to-close (downward swipe)
  const handlePan = useCallback((_e: PointerEvent, info: PanInfo) => {
    panOffset.set(Math.max(0, info.offset.y));
  }, [panOffset]);

  const handlePanEnd = useCallback((_e: PointerEvent, info: PanInfo) => {
    if (info.offset.y > CLOSE_THRESHOLD || info.velocity.y > 500) {
      const h = panelRef.current?.getBoundingClientRect().height ?? 600;
      animate(panOffset, h, { duration: 0.25, ease: EASE }).then(onClose);
    } else {
      animate(panOffset, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  }, [panOffset, onClose]);

  const handleConfirm = () => {
    const repsDone = Math.max(0, parseInt(reps) || 0);
    const weightVal = weight ? parseFloat(weight) : undefined;
    onConfirm(repsDone, weightVal);
  };

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
            onClick={() => onConfirm(parseInt(reps) || targetRepsMax, undefined)}
            className="h-10 w-full text-[11px] font-bold uppercase tracking-widest text-white/30 transition-colors hover:text-white/50"
          >
            Skip weight
          </button>
        </div>
      </motion.div>
    </>
  );
}
