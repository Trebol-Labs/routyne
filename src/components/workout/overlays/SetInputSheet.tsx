'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
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

const panelVariants = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const } },
  exit: { y: '110%', transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as const } },
};

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

  const handleConfirm = () => {
    const repsDone = Math.max(0, parseInt(reps) || 0);
    const weightVal = weight ? parseFloat(weight) : undefined;
    onConfirm(repsDone, weightVal);
  };

  return (
    <>
      <motion.div
        key="setinput-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="setinput-panel"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed bottom-0 left-0 right-0 z-[200] glass-panel rounded-t-[2.5rem] border-white/10 px-6 pt-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">
          SET {setIdx + 1}
        </p>
        <h3 className="text-xl font-black text-white uppercase tracking-tight font-display mb-6 truncate">
          {exerciseName}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="sunken-glass rounded-2xl p-4 text-4xl font-black text-white text-center w-full bg-transparent border-none outline-none"
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
              className="sunken-glass rounded-2xl p-4 text-4xl font-black text-white text-center w-full bg-transparent border-none outline-none placeholder:text-white/20"
              min={0}
            />
          </div>
        </div>

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
          className="w-full h-10 mt-2 text-sm font-black text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors"
        >
          Skip weight
        </button>
      </motion.div>
    </>
  );
}
