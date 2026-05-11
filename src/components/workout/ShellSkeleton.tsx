'use client';

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export function ShellSkeleton() {
  return (
    <motion.main
      key="shell-skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="min-h-[100dvh] liquid-bg-dark text-zinc-100 overflow-hidden"
    >
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-24 left-[-6rem] h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-1/3 right-[-5rem] h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-12 left-1/4 h-40 w-40 rounded-full bg-cyan-500/[0.08] blur-3xl" />
      </div>

      <div className="max-w-screen-md mx-auto h-dvh flex flex-col relative px-[var(--space-page-x)]">
        <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/75 via-black/20 to-transparent pointer-events-none" />

        <div className="sticky top-3 z-[var(--z-header)] w-full flex justify-center pointer-events-none mb-2">
          <div className="pointer-events-auto w-full px-4 sm:px-5 py-3 flex items-start justify-between gap-3 glass-panel rounded-2xl border-white/20 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
              <Skeleton className="h-11 w-11 rounded-[1rem] bg-white/10 border border-white/5" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-28 rounded-full bg-white/10" />
                <Skeleton className="h-2.5 w-36 rounded-full bg-white/10" />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Skeleton className="h-11 w-11 rounded-full bg-white/10" />
              <Skeleton className="h-11 w-11 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        <div className="flex-grow pt-4 pb-[var(--space-nav-clear)] flex flex-col gap-5 overflow-hidden">
          <a href="#main-content" className="sr-only">
            Skip to content
          </a>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 flex flex-col overflow-hidden gap-4"
          >
            <div className="glass-panel rounded-[1.75rem] border-white/10 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-2.5 w-24 rounded-full bg-white/10" />
                <Skeleton className="h-2.5 w-16 rounded-full bg-white/10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full bg-white/[0.08]" />
              <Skeleton className="h-2 w-5/6 rounded-full bg-white/[0.08]" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Skeleton className="h-12 rounded-[1rem] bg-white/[0.08]" />
                <Skeleton className="h-12 rounded-[1rem] bg-white/[0.08]" />
                <Skeleton className="h-12 rounded-[1rem] bg-white/[0.08]" />
              </div>
            </div>

            <div className="space-y-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="glass-panel rounded-[1.35rem] border-white/[0.08] p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl bg-white/10" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-40 rounded-full bg-white/10" />
                      <Skeleton className="h-2.5 w-28 rounded-full bg-white/[0.08]" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-xl bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
        <div
          className="fixed bottom-0 inset-x-0 flex justify-center px-3 sm:px-4 z-[var(--z-nav)]"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 18px)' }}
        >
          <nav className="relative flex items-center justify-between gap-1.5 p-2 w-full max-w-sm glass-panel rounded-[20px] border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <div className="absolute inset-0 rounded-[24px] border border-white/5 pointer-events-none" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                className={`h-11 w-11 rounded-lg bg-white/10 ${index === 0 ? 'ring-2 ring-white/20' : ''}`}
              />
            ))}
          </nav>
        </div>
      </div>
    </motion.main>
  );
}
