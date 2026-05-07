'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  stepKey: string;
  children: ReactNode;
}

export function OnboardingShell({ step, totalSteps, stepKey, children }: OnboardingShellProps) {
  const progressPct = ((step + 1) / totalSteps) * 100;

  return (
    <main className="min-h-[100dvh] liquid-bg-dark text-zinc-100 selection:bg-blue-500/40 font-sans">
      <div className="max-w-screen-md mx-auto h-dvh flex flex-col px-[var(--space-page-x)]">
        <header className="pt-6 pb-4">
          <div
            className="h-1 w-full rounded-full bg-white/5 overflow-hidden"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-[rgb(var(--accent-primary-rgb))] to-[rgb(var(--accent-secondary-rgb))]"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepKey}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
