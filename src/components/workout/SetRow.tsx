'use client';

import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { Check, ChevronRight, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedExercise, SetStatus } from '@/types/workout';
import { useEffect, useRef, useCallback } from 'react';
import { pulseGlow } from '@/lib/animations';

export type SetRowState = 'idle' | 'armed' | 'completed';

export interface AutoSuggestion {
  repsDone: number;
  weight?: number;
}

interface SetRowProps {
  setIdx: number;
  exercise: ParsedExercise;
  setStatus?: SetStatus;
  weightUnit: 'kg' | 'lbs';
  phase: SetRowState;
  preview?: AutoSuggestion | null;
  onSwipe: () => void;
  onTap: () => void;
}

const SWIPE_THRESHOLD = 100;
const PREVIEW_OFFSET = 44;
const EASE = [0.23, 1, 0.32, 1] as const;
const SNAP_SPRING = { type: 'spring', stiffness: 480, damping: 32 } as const;

function formatTargetRange(exercise: ParsedExercise): string {
  return `${exercise.repsMin}${exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''} reps`;
}

function formatSetDetails(
  repsDone?: number,
  weight?: number,
  weightUnit?: 'kg' | 'lbs'
): string {
  if ((repsDone ?? 0) <= 0) {
    return 'Not logged';
  }

  if ((weight ?? 0) > 0 && weightUnit) {
    return `${repsDone} reps @ ${weight} ${weightUnit}`;
  }

  return `${repsDone} reps — bodyweight`;
}

export function SetRow({
  setIdx,
  exercise,
  setStatus,
  weightUnit,
  phase,
  preview,
  onSwipe,
  onTap,
}: SetRowProps) {
  const x = useMotionValue(0);
  const cardRef = useRef<HTMLButtonElement>(null);

  const isCompleted = phase === 'completed';
  const isArmed = phase === 'armed';
  const hasWeight = (setStatus?.weight ?? 0) > 0;

  useEffect(() => {
    animate(x, isArmed ? PREVIEW_OFFSET : 0, isArmed ? { duration: 0.35, ease: EASE } : SNAP_SPRING);
  }, [isArmed, x]);

  useEffect(() => {
    if (isCompleted && cardRef.current) {
      pulseGlow(cardRef.current);
    }
  }, [isCompleted]);

  /* ─── Swipe reveal layer transforms ─── */
  const bgOpacity = useTransform(x, [0, SWIPE_THRESHOLD * 0.4, SWIPE_THRESHOLD], [0, 0.6, 1]);
  const iconScale = useTransform(x, [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0.5, 0.85, 1]);
  const iconX = useTransform(x, [0, SWIPE_THRESHOLD], [0, 8]);

  const handleDragEnd = useCallback((_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (isCompleted) {
      return;
    }

    const shouldConfirm = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 600;
    const shouldEdit = isArmed && (info.offset.x < -24 || info.velocity.x < -280);

    if (shouldEdit) {
      if ('vibrate' in navigator) navigator.vibrate(30);
      onTap();
      return;
    }

    if (shouldConfirm) {
      if ('vibrate' in navigator) navigator.vibrate(50);
      onSwipe();
      return;
    }

    animate(x, isArmed ? PREVIEW_OFFSET : 0, SNAP_SPRING);
  }, [isArmed, isCompleted, onSwipe, onTap, x]);

  const titleText = isCompleted ? 'Logged' : isArmed ? 'Ready' : `Set ${setIdx + 1}`;
  const detailText = isCompleted
    ? formatSetDetails(setStatus?.repsDone, setStatus?.weight, weightUnit)
    : isArmed
      ? formatSetDetails(preview?.repsDone, preview?.weight, weightUnit)
      : formatTargetRange(exercise);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* ─── Swipe reveal background ─── */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: bgOpacity }}
        className={cn(
          'absolute inset-0 flex items-center pl-5',
          isArmed
            ? 'bg-gradient-to-r from-emerald-500/30 via-emerald-500/20 to-transparent'
            : 'bg-gradient-to-r from-blue-500/25 via-blue-500/15 to-transparent',
        )}
      >
        <motion.div
          style={{ scale: iconScale, x: iconX }}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            isArmed
              ? 'bg-emerald-500/30 text-emerald-300'
              : 'bg-blue-500/25 text-blue-300',
          )}
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </motion.div>
      </motion.div>

      {/* ─── Card ─── */}
      <motion.button
        ref={cardRef}
        type="button"
        onClick={onTap}
        aria-label={
          isCompleted
            ? `Set ${setIdx + 1} logged with ${detailText}. Tap to undo.`
            : isArmed
              ? `Set ${setIdx + 1} previewed with ${detailText}. Swipe right to log or tap to edit.`
              : `Set ${setIdx + 1} target ${formatTargetRange(exercise)}. Swipe right for quick log or tap to enter manually.`
        }
        drag={isCompleted ? false : 'x'}
        dragConstraints={{ left: isArmed ? -(PREVIEW_OFFSET + 24) : 0, right: SWIPE_THRESHOLD + 24 }}
        dragElastic={0.1}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 700, bounceDamping: 28 }}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.015 }}
        style={{ x, touchAction: 'pan-y' }}
        className={cn(
          'relative z-10 flex w-full select-none items-center gap-3 rounded-2xl border px-3.5 py-3 text-left',
          'backdrop-blur-md transition-colors duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          isCompleted && hasWeight && 'border-emerald-400/15 bg-emerald-500/[0.07]',
          isCompleted && !hasWeight && 'border-amber-400/15 bg-amber-500/[0.06]',
          isArmed && 'border-sky-400/25 bg-sky-500/[0.08] shadow-[0_8px_24px_-12px_rgba(56,189,248,0.5)]',
          phase === 'idle' && 'border-white/[0.06] bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.045]',
        )}
      >
        {/* ─── Set number badge ─── */}
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-black font-display transition-colors duration-300',
            isCompleted && hasWeight && 'border-emerald-400/20 bg-emerald-500/15 text-emerald-200',
            isCompleted && !hasWeight && 'border-amber-400/20 bg-amber-500/12 text-amber-200',
            isArmed && 'border-sky-400/20 bg-sky-500/12 text-sky-200',
            phase === 'idle' && 'border-white/8 bg-white/[0.04] text-white/55',
          )}
        >
          {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : setIdx + 1}
        </div>

        {/* ─── Text content ─── */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'truncate text-[14px] font-black leading-none tracking-tight font-display',
                isCompleted && hasWeight && 'text-emerald-100',
                isCompleted && !hasWeight && 'text-amber-100',
                isArmed && 'text-sky-100',
                phase === 'idle' && 'text-white/90',
              )}
            >
              {titleText}
            </span>
            {isArmed && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-sky-300/60"
              >
                swipe to log
              </motion.span>
            )}
          </div>
          <span
            className={cn(
              'mt-0.5 block min-w-0 truncate text-[11px] font-semibold leading-tight',
              isCompleted && hasWeight && 'text-emerald-200/70',
              isCompleted && !hasWeight && 'text-amber-200/70',
              isArmed && 'text-sky-200/75',
              phase === 'idle' && 'text-white/40',
            )}
          >
            {detailText}
          </span>
        </div>

        {/* ─── Right action indicator ─── */}
        <div
          aria-hidden="true"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300',
            isCompleted && hasWeight && 'border-emerald-400/15 bg-emerald-500/10 text-emerald-300/80',
            isCompleted && !hasWeight && 'border-amber-400/15 bg-amber-500/10 text-amber-300/80',
            isArmed && 'border-sky-400/15 bg-sky-500/10 text-sky-300',
            phase === 'idle' && 'border-white/[0.06] bg-white/[0.025] text-white/25',
          )}
        >
          {isCompleted ? (
            <Undo2 className="h-3.5 w-3.5" />
          ) : isArmed ? (
            <Check className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </motion.button>
    </div>
  );
}
