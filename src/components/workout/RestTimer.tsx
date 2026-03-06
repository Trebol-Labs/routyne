'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestTimerProps {
  duration: number; // in seconds
  onFinish?: () => void;
  onClose: () => void;
}

// SVG circle: r=66 → circumference = 2 * π * 66 ≈ 414.7
const RADIUS = 66;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Compact rest timer — floats above the bottom nav as a small glass card.
 * Uses Date.now() + requestAnimationFrame for high-accuracy countdown.
 */
export function RestTimer({ duration, onFinish, onClose }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [targetTime, setTargetTime] = useState(() => Date.now() + duration * 1000);
  const [isRunning, setIsRunning] = useState(true);
  const requestRef = useRef<number>(0);
  const tickRef = useRef<() => void>(() => {});
  const circleRef = useRef<SVGCircleElement>(null);

  const tick = useCallback(() => {
    if (!isRunning) return;

    const now = Date.now();
    const remainingMs = Math.max(0, targetTime - now);
    const remainingSec = Math.ceil(remainingMs / 1000);

    setTimeLeft(prev => prev !== remainingSec ? remainingSec : prev);

    if (circleRef.current) {
      const progress = Math.max(0, Math.min(1, remainingMs / (duration * 1000)));
      circleRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    }

    if (remainingMs <= 0) {
      if (onFinish) onFinish();
      setIsRunning(false);
      return;
    }

    requestRef.current = requestAnimationFrame(tickRef.current);
  }, [isRunning, targetTime, onFinish, duration]);

  useEffect(() => { tickRef.current = tick; }, [tick]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(tickRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isRunning]);

  const addTime = (seconds: number) => {
    const newTarget = targetTime + seconds * 1000;
    setTargetTime(newTarget);
    if (circleRef.current) {
      const remainingMs = Math.max(0, newTarget - Date.now());
      const progress = Math.max(0, Math.min(1, remainingMs / (duration * 1000)));
      circleRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    }
  };

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      setTargetTime(Date.now() + timeLeft * 1000);
      setIsRunning(true);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

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
      {/* Gradient backdrop — fades from timer up to transparent, positioned behind */}
      <div className="absolute bottom-full left-0 right-0 h-16 bg-gradient-to-b from-transparent via-black/20 to-black/70 rounded-t-[1.75rem] pointer-events-none" />

      <div className="glass-panel rounded-[1.75rem] border-white/15 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden relative">
        {/* Inner border glow */}
        <div className="absolute inset-0 rounded-[1.75rem] border border-white/5 pointer-events-none" />

        <div className="relative flex items-center gap-4 px-4 py-4">
          {/* Compact ring */}
          <div className="relative shrink-0 w-[88px] h-[88px] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 152 152">
              <circle
                cx="76" cy="76" r={RADIUS}
                fill="transparent"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="7"
              />
              <circle
                ref={circleRef}
                cx="76" cy="76" r={RADIUS}
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

          {/* Label + controls */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] font-display">Rest Timer</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                onClick={() => addTime(-15)}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white/70"
              >
                −15s
              </Button>
              <button
                onClick={toggleTimer}
                className="active-glass-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95"
                aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
              >
                {isRunning
                  ? <Pause className="w-3.5 h-3.5 text-white fill-white" />
                  : <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                }
              </button>
              <Button
                variant="glass"
                onClick={() => addTime(15)}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white/70"
              >
                +15s
              </Button>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="shrink-0 self-start w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close rest timer"
          >
            <X className="w-3 h-3 text-white/50" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
