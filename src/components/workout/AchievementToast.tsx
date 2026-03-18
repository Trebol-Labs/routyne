'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ACHIEVEMENTS } from '@/lib/achievements/definitions';

interface AchievementToastProps {
  achievementIds: string[];
  onDismiss: () => void;
}

export function AchievementToast({ achievementIds, onDismiss }: AchievementToastProps) {
  const defs = achievementIds
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean) as typeof ACHIEVEMENTS;

  useEffect(() => {
    if (defs.length === 0) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [defs.length, onDismiss]);

  return (
    <AnimatePresence>
      {defs.length > 0 && (
        <div className="fixed top-4 inset-x-4 z-[var(--z-toast,9999)] space-y-2 pointer-events-none">
          {defs.map((def) => (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="pointer-events-auto"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-black/80 backdrop-blur-xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-amber-400/20 blur-lg rounded-full animate-pulse" />
                  <span className="relative text-2xl">{def.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/60 mb-0.5">Achievement Unlocked</p>
                  <p className="text-sm font-black text-white truncate">{def.name}</p>
                  <p className="text-[10px] font-medium text-white/40 truncate">{def.description}</p>
                </div>
                <button
                  onClick={onDismiss}
                  className="shrink-0 p-1 rounded-lg text-white/20 hover:text-white/50 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
