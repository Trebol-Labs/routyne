'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlateCalculatorProps {
  targetWeight: number;
  unit: 'kg' | 'lbs';
  onClose: () => void;
  onApply?: (weight: number) => void;
}

// ── Config ────────────────────────────────────────────────────────────────────

const BARBELL_OPTIONS_KG = [20, 15, 10] as const;
const BARBELL_OPTIONS_LBS = [45, 35] as const;
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

const PLATE_COLORS: Record<number, string> = {
  45: '#ef4444',
  25: '#3b82f6',  // blue for 25kg
  35: '#f59e0b',
  20: '#ef4444',  // red for 20kg
  15: '#f59e0b',  // amber
  10: '#22c55e',  // green
  5:  '#ffffff',  // white
  2.5: '#8b5cf6', // purple
  1.25: '#06b6d4', // cyan
};

function plateColor(size: number): string {
  return PLATE_COLORS[size] ?? '#6b7280';
}

// ── Plate calculation ─────────────────────────────────────────────────────────

function calcPlates(
  target: number,
  barbellWeight: number,
  availablePlates: number[],
): { plates: number[]; loaded: number; remainder: number } {
  const perSide = (target - barbellWeight) / 2;
  if (perSide <= 0) return { plates: [], loaded: barbellWeight, remainder: target - barbellWeight };

  const plates: number[] = [];
  let remaining = perSide;

  for (const size of [...availablePlates].sort((a, b) => b - a)) {
    while (remaining >= size - 0.001) {
      plates.push(size);
      remaining -= size;
      remaining = Math.round(remaining * 1000) / 1000; // float precision
    }
  }

  const loaded = barbellWeight + plates.reduce((s, p) => s + p * 2, 0);
  return { plates, loaded, remainder: Math.round(remaining * 1000) / 1000 };
}

// ── Plate visual ──────────────────────────────────────────────────────────────

function PlateStack({ plates, unit }: { plates: number[]; unit: string }) {
  if (plates.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-12">
        <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">No plates</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {plates.map((size, i) => {
        const height = Math.max(24, Math.min(72, size * 2.4));
        const width = 12 + (size > 10 ? 4 : 0);
        return (
          <div
            key={i}
            className="rounded-sm flex items-center justify-center text-white font-black text-[7px] shrink-0"
            style={{
              height: `${height}px`,
              width: `${width}px`,
              backgroundColor: plateColor(size),
              opacity: 0.85,
              writingMode: 'vertical-rl',
              letterSpacing: '0.05em',
            }}
            title={`${size}${unit}`}
          >
            {size}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const EASE = [0.23, 1, 0.32, 1] as const;

export function PlateCalculator({ targetWeight, unit, onClose, onApply }: PlateCalculatorProps) {
  const defaultBarbell = unit === 'kg' ? 20 : 45;
  const [barbellWeight, setBarbellWeight] = useState(defaultBarbell);
  const [inputWeight, setInputWeight] = useState(String(targetWeight || ''));
  const [showBarbellPicker, setShowBarbellPicker] = useState(false);

  const barbellOptions = unit === 'kg' ? BARBELL_OPTIONS_KG : BARBELL_OPTIONS_LBS;
  const availablePlates = unit === 'kg' ? PLATES_KG : PLATES_LBS;

  const parsedTarget = parseFloat(inputWeight) || 0;
  const { plates, loaded, remainder } = useMemo(
    () => calcPlates(parsedTarget, barbellWeight, availablePlates),
    [parsedTarget, barbellWeight, availablePlates],
  );

  const isExact = remainder < 0.01;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="platecalc-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/70 backdrop-blur-sm touch-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        key="platecalc-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Plate Calculator"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.4, ease: EASE }}
        className="fixed bottom-0 left-0 right-0 z-[var(--z-overlay)] glass-panel rounded-t-3xl border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h3 className="font-display text-lg font-black uppercase tracking-tight text-white">
            Plate Calculator
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] transition-colors hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Target weight + barbell selector */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                Target ({unit})
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                className="sunken-glass w-full rounded-xl bg-transparent px-4 py-3 text-xl font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                min={0}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                Bar
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowBarbellPicker((v) => !v)}
                  className="sunken-glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white/70"
                >
                  {barbellWeight}{unit}
                  <ChevronDown className="w-3 h-3 text-white/30" />
                </button>
                <AnimatePresence>
                  {showBarbellPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute bottom-full mb-1 left-0 glass-panel rounded-xl border-white/10 overflow-hidden z-10"
                    >
                      {barbellOptions.map((w) => (
                        <button
                          key={w}
                          onClick={() => { setBarbellWeight(w); setShowBarbellPicker(false); }}
                          className={cn(
                            'block w-full px-4 py-2.5 text-left text-sm font-black transition-colors',
                            w === barbellWeight ? 'text-blue-300 bg-blue-500/10' : 'text-white/60 hover:bg-white/5'
                          )}
                        >
                          {w}{unit}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Loaded weight badge */}
          <div className={cn(
            'flex items-center justify-between rounded-2xl border px-4 py-3',
            isExact
              ? 'border-emerald-500/25 bg-emerald-500/[0.08]'
              : 'border-amber-500/25 bg-amber-500/[0.08]'
          )}>
            <div>
              <p className={cn('text-[10px] font-black uppercase tracking-[0.25em]',
                isExact ? 'text-emerald-300/50' : 'text-amber-300/50')}>
                {isExact ? 'Loaded weight' : 'Closest achievable'}
              </p>
              <p className={cn('text-xl font-black mt-0.5',
                isExact ? 'text-emerald-300' : 'text-amber-300')}>
                {loaded} {unit}
              </p>
            </div>
            {!isExact && remainder > 0 && (
              <p className="text-[11px] font-bold text-amber-400/60">
                +{remainder.toFixed(2)} {unit} short
              </p>
            )}
          </div>

          {/* Visual barbell diagram */}
          <div className="sunken-glass rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-4">
              Per side: {plates.reduce((s, p) => s + p, 0).toFixed(2)} {unit}
            </p>

            <div className="flex items-center justify-center gap-0">
              {/* Left plates (reversed — innermost first visually) */}
              <div className="flex items-center gap-0.5 flex-row-reverse">
                <PlateStack plates={[...plates].reverse()} unit={unit} />
              </div>

              {/* Barbell sleeve */}
              <div className="flex flex-col items-center mx-1">
                <div
                  className="rounded bg-white/20 border border-white/10"
                  style={{ width: '8px', height: '56px' }}
                />
              </div>

              {/* Center bar label */}
              <div
                className="flex items-center justify-center rounded-sm text-[8px] font-black text-white/30 mx-1"
                style={{ height: '24px', width: '40px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {barbellWeight}{unit}
              </div>

              {/* Right barbell sleeve */}
              <div className="flex flex-col items-center mx-1">
                <div
                  className="rounded bg-white/20 border border-white/10"
                  style={{ width: '8px', height: '56px' }}
                />
              </div>

              {/* Right plates */}
              <div className="flex items-center gap-0.5">
                <PlateStack plates={plates} unit={unit} />
              </div>
            </div>

            {/* Plate legend */}
            {plates.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[...new Set(plates)].sort((a, b) => b - a).map((size) => {
                  const count = plates.filter((p) => p === size).length;
                  return (
                    <div key={size} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: plateColor(size) }} />
                      <span className="text-[10px] font-bold text-white/50">
                        {count}×{size}{unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Apply button */}
          {onApply && loaded > 0 && (
            <button
              onClick={() => { onApply(loaded); onClose(); }}
              className="active-glass-btn flex h-12 w-full items-center justify-center rounded-2xl text-[13px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.98]"
            >
              Use {loaded} {unit}
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
