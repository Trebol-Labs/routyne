'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { getRestTimerRemainingMs } from '@/lib/rest-timer';
import { useI18n } from '@/components/i18n/LanguageProvider';

interface RestTimerProps {
  onFinish?: () => void;
  onClose?: () => void;
}

// SVG circle: r=66 → circumference = 2 * π * 66 ≈ 414.7
const RADIUS = 66;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Compact rest timer — floats above the bottom nav as a small glass card.
 * The store owns the timer state; this component only renders and dispatches actions.
 */
export function RestTimer({ onFinish, onClose }: RestTimerProps) {
  const timer = useWorkoutStore((state) => state.restTimer);
  const pauseRestTimer = useWorkoutStore((state) => state.pauseRestTimer);
  const resumeRestTimer = useWorkoutStore((state) => state.resumeRestTimer);
  const adjustRestTimer = useWorkoutStore((state) => state.adjustRestTimer);
  const finishRestTimer = useWorkoutStore((state) => state.finishRestTimer);
  const clearRestTimer = useWorkoutStore((state) => state.clearRestTimer);
  const { language } = useI18n();
  const circleRef = useRef<SVGCircleElement>(null);
  const finishNotifiedTimerId = useRef<string | null>(null);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    finishNotifiedTimerId.current = null;
  }, [timer?.id]);

  useEffect(() => {
    if (!timer || timer.status !== 'running') {
      return;
    }

    const id = window.setInterval(() => {
      setFrame((value) => value + 1);
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, [timer]);

  const remainingMs = timer
    ? (timer.status === 'running'
      ? getRestTimerRemainingMs(timer)
      : Math.max(0, Math.round(timer.remainingMs))
    )
    : 0;
  const displayMs = timer?.status === 'running' ? remainingMs : Math.max(0, Math.round(timer?.remainingMs ?? 0));
  const totalMs = Math.max(1, (timer?.durationSeconds ?? 0) * 1000);
  const isFinished = timer?.status === 'finished';
  const isRunning = timer?.status === 'running';
  const totalSeconds = Math.max(0, Math.ceil(displayMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const closeLabel = language === 'en' ? 'Close rest timer' : 'Cerrar temporizador de descanso';
  const pauseLabel = isRunning
    ? (language === 'en' ? 'Pause timer' : 'Pausar temporizador')
    : (language === 'en' ? 'Resume timer' : 'Reanudar temporizador');
  const doneLabel = language === 'en' ? 'Done' : 'Listo';

  useEffect(() => {
    if (!timer) {
      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = String(CIRCUMFERENCE);
      }
      return;
    }

    if (isRunning && remainingMs <= 0) {
      if (finishNotifiedTimerId.current !== timer.id) {
        finishNotifiedTimerId.current = timer.id;
        onFinish?.();
      }
      void finishRestTimer();
      return;
    }

    if (circleRef.current) {
      const progress = Math.max(0, Math.min(1, displayMs / totalMs));
      circleRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    }
  }, [displayMs, finishRestTimer, isRunning, onFinish, remainingMs, timer, totalMs, frame]);

  if (!timer) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 12 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      // Sit above the bottom nav: nav is ~72px tall + safe-area padding (~18px min)
      className="fixed left-1/2 -translate-x-1/2 z-[var(--z-timer)] w-[calc(100%-32px)] max-w-sm"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 18px) + 80px)' }}
    >
      <div className="absolute bottom-full left-0 right-0 h-16 bg-gradient-to-b from-transparent via-black/20 to-black/70 rounded-t-[1.75rem] pointer-events-none" />

      <div className="glass-panel rounded-[1.75rem] border-white/15 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden relative">
        <div className="absolute inset-0 rounded-[1.75rem] border border-white/5 pointer-events-none" />

        <div className="relative flex items-center gap-4 px-4 py-4">
          <div className="relative shrink-0 w-[88px] h-[88px] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 152 152">
              <circle
                cx="76"
                cy="76"
                r={RADIUS}
                fill="transparent"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="7"
              />
              <circle
                ref={circleRef}
                cx="76"
                cy="76"
                r={RADIUS}
                fill="transparent"
                stroke="url(#timerGrad)"
                strokeWidth="8"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <span
              className="text-2xl font-black text-white tabular-nums leading-none font-display"
              aria-live="polite"
              aria-label={`${minutes} minutes ${seconds} seconds remaining`}
            >
              {minutes}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] font-display">
                {language === 'en' ? 'Rest' : 'Descanso'}
              </span>
              {isFinished && (
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400/70">
                  {doneLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                onClick={() => void adjustRestTimer(-15)}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white/70"
                disabled={isFinished}
              >
                −15s
              </Button>
              <button
                onClick={() => {
                  if (isRunning) {
                    void pauseRestTimer();
                  } else {
                    void resumeRestTimer();
                  }
                }}
                className="active-glass-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={pauseLabel}
                disabled={isFinished}
              >
                {isRunning
                  ? <Pause className="w-3.5 h-3.5 text-white fill-white" />
                  : <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                }
              </button>
              <Button
                variant="glass"
                onClick={() => void adjustRestTimer(15)}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white/70"
                disabled={isFinished}
              >
                +15s
              </Button>
            </div>
          </div>

          <button
            onClick={() => {
              void clearRestTimer();
              onClose?.();
            }}
            className="shrink-0 self-start w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={closeLabel}
          >
            <X className="w-3 h-3 text-white/50" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
