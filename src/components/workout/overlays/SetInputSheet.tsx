'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
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

  // Lock background scroll while sheet is open (same as Sheet.tsx)
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
      {/* Backdrop — same z-level as Sheet.tsx overlays */}
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
        style={{ position: 'fixed', marginTop: panOffset }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        className="inset-x-0 bottom-0 z-[var(--z-overlay)] glass-panel rounded-t-[2rem] border-white/10 overscroll-none touch-pan-x cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" aria-hidden="true" />

        {/* Header row */}
        <div className="flex items-start justify-between px-6 pt-3 pb-4">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">
              Set {setIdx + 1}
            </p>
            <h3 className="text-lg font-black text-white uppercase tracking-tight font-display truncate leading-tight">
              {exerciseName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="mt-1 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-3 h-3 text-white/60" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="sunken-glass rounded-2xl px-3 py-4 text-4xl font-black text-white text-center w-full bg-transparent border-none outline-none"
              min={0}
              max={999}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block">
              Weight ({weightUnit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="—"
              className="sunken-glass rounded-2xl px-3 py-4 text-4xl font-black text-white text-center w-full bg-transparent border-none outline-none placeholder:text-white/20"
              min={0}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-10 space-y-2">
          <button
            onClick={handleConfirm}
            className={cn(
              'active-glass-btn w-full h-14 rounded-[1.5rem] flex items-center justify-center gap-3',
              'text-base font-black text-white uppercase tracking-widest transition-all'
            )}
          >
            <CheckCircle2 className="w-5 h-5" />
            Log Set
          </button>

          <button
            onClick={() => onConfirm(parseInt(reps) || targetRepsMax, undefined)}
            className="w-full h-10 text-sm font-black text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors"
          >
            Skip weight
          </button>
        </div>
      </motion.div>
    </>
  );
}
