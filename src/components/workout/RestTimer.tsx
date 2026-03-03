'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestTimerProps {
  duration: number; // in seconds
  onFinish?: () => void;
  onClose: () => void;
}

/**
 * Resilient Rest Timer component with Liquid Glass aesthetics.
 * Uses Date.now() comparison via requestAnimationFrame for high accuracy.
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
        const totalMs = duration * 1000;
        // Calculate offset based on remaining time relative to total duration
        // When remaining == duration (start), progress = 1, offset = 0
        // When remaining == 0 (end), progress = 0, offset = 552.9
        const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
        const offset = 552.9 * (1 - progress);
        circleRef.current.style.strokeDashoffset = String(offset);
    }

    if (remainingMs <= 0) {
      if (onFinish) onFinish();
      setIsRunning(false);
      return;
    }

    requestRef.current = requestAnimationFrame(tickRef.current);
  }, [isRunning, targetTime, onFinish, duration]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(tickRef.current);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning]);

  const addTime = (seconds: number) => {
    setTargetTime((prev) => prev + seconds * 1000);
    // Force update circle immediately to prevent jump
    if (circleRef.current) {
        const now = Date.now();
        const newTarget = targetTime + seconds * 1000; // Use new target
        const remainingMs = Math.max(0, newTarget - now);
        const totalMs = duration * 1000;
        const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
        const offset = 552.9 * (1 - progress);
        circleRef.current.style.strokeDashoffset = String(offset);
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[var(--z-timer)] w-[calc(100%-48px)] max-w-[400px] glass-panel rounded-[var(--radius-xl)] p-8 border-white/20 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      {/* Liquid background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 blur-[var(--blur-glow)] rounded-full pointer-events-none" />
      
      <div className="relative flex flex-col items-center space-y-8">
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] font-display">Rest Timer</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/20 hover:text-white transition-colors"
            title="Close rest timer"
            aria-label="Close rest timer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Circular progress display (simplification for codebrevity) */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="transparent"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="8"
            />
            <circle
              ref={circleRef}
              cx="96"
              cy="96"
              r="88"
              fill="transparent"
              stroke="url(#timerGradient)"
              strokeWidth="10"
              strokeDasharray="552.9"
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="flex flex-col items-center" aria-live="polite" aria-label={`Rest timer: ${Math.floor(timeLeft / 60)} minutes ${timeLeft % 60} seconds remaining`}>
            <span className="text-6xl font-black text-white tracking-tighter tabular-nums leading-none font-display">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full pt-4">
          <Button 
            variant="glass" 
            onClick={() => addTime(-15)}
            className="flex-1 rounded-[1.5rem] h-12 text-white font-black"
          >
            -15s
          </Button>
          <Button 
            variant="glass-primary"
            onClick={toggleTimer}
            className="w-16 h-16 rounded-full flex items-center justify-center p-0"
          >
            {isRunning ? (
              <div className="flex gap-1.5"><div className="w-1.5 h-5 bg-white rounded-full" /><div className="w-1.5 h-5 bg-white rounded-full" /></div>
            ) : (
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            )}
          </Button>
          <Button 
            variant="glass" 
            onClick={() => addTime(15)}
            className="flex-1 rounded-[1.5rem] h-12 text-white font-black"
          >
            +15s
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
