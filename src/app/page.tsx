'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { RoutineUploader } from '@/components/workout/RoutineUploader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { Button } from '@/components/ui/button';
import { RoutineOverviewView } from '@/components/workout/views/RoutineOverviewView';
import { ActiveSessionView } from '@/components/workout/views/ActiveSessionView';
import { HistoryView } from '@/components/workout/views/HistoryView';
import { StatsView } from '@/components/workout/views/StatsView';
import { ProfileSheet } from '@/components/workout/overlays/ProfileSheet';
import { SearchSheet } from '@/components/workout/overlays/SearchSheet';
import {
  Plus,
  Calendar,
  Search,
  TrendingUp,
  User,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutView } from '@/types/workout';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useHydration } from '@/hooks/useHydration';

export default function Home() {
  const isReady = useHydration();

  const {
    currentRoutine,
    currentView,
    setCurrentView,
    resetAll,
  } = useWorkoutStore();

  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Screen Wake Lock during active sessions
  useWakeLock(currentView === 'active-session');

  if (!isReady) {
    return (
      <main className="min-h-screen liquid-bg-dark flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-blue-600 blur-[var(--blur-lg)] opacity-40 animate-pulse rounded-full" />
            <div className="relative w-16 h-16 rounded-[var(--radius-lg)] bg-gradient-to-tr from-white/20 to-white/5 p-px backdrop-blur-3xl shadow-2xl">
              <div className="w-full h-full rounded-[var(--radius-md)] bg-black/40 flex items-center justify-center border border-white/5">
                <Dumbbell className="text-white w-8 h-8 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.3em]">Loading...</p>
        </motion.div>
      </main>
    );
  }

  const handleNavClick = (view: WorkoutView) => {
    if (view === 'uploader' && currentRoutine) {
      if (confirm('Start a new routine? Current data will be lost.')) {
        resetAll();
      }
      return;
    }
    setCurrentView(view);
  };

  return (
    <main className="min-h-screen liquid-bg-dark text-zinc-100 selection:bg-blue-500/40 font-sans pb-40">
      <div className="max-w-screen-md mx-auto min-h-screen flex flex-col relative px-4">

        {/* Apple Liquid Glass Header */}
        <div className="sticky top-4 z-[var(--z-header)] w-full flex justify-center pointer-events-none mb-4">
          <header className="pointer-events-auto w-full px-6 py-4 flex items-center justify-between glass-panel rounded-[var(--radius-xl)] border-white/10 shadow-2xl">
            <div className="absolute inset-0 -z-10 bg-blue-600/10 blur-[var(--blur-ambient)] rounded-[var(--radius-xl)] pointer-events-none" />
            <div className="flex items-center gap-5">
              <div className="relative group">
                 <div className="absolute inset-0 bg-blue-600 blur-[var(--blur-lg)] opacity-40 group-hover:opacity-80 transition-opacity" />
                 <div className="relative w-12 h-12 rounded-[var(--radius-md)] bg-gradient-to-tr from-white/20 to-white/5 p-px backdrop-blur-3xl shadow-2xl">
                    <div className="w-full h-full rounded-[var(--radius-sm)] bg-black/40 flex items-center justify-center border border-white/5">
                      <Dumbbell className="text-white w-7 h-7" />
                    </div>
                 </div>
              </div>
              <div className="flex flex-col">
                <h1 className="sr-only">Routyne Workout Tracker</h1>
                <span className="text-2xl font-black tracking-tighter leading-none text-white font-display" aria-hidden="true">ROUTYNE</span>
                <div className="flex items-center gap-2 mt-1.5 pl-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.3em] whitespace-nowrap">OFFLINE READY</p>
                </div>
              </div>
            </div>

            <nav className="flex items-center gap-3">
              <Button variant="glass-icon" size="icon-lg" aria-label="Search" onClick={() => setShowSearch(true)}>
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="glass-icon" size="icon-lg" aria-label="Profile" onClick={() => setShowProfile(true)}>
                <User className="w-5 h-5" />
              </Button>
            </nav>
          </header>
        </div>

        <div className="flex-grow pt-10 pb-[var(--space-nav-clear)]">
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-black focus:text-white focus:rounded-lg">
            Skip to content
          </a>
          <AnimatePresence mode="wait">
            {currentView === 'uploader' ? (
              <motion.div
                key="uploader"
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -40 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                className="flex-grow h-full flex items-center justify-center"
                id="main-content"
              >
                <ErrorBoundary
                  fallback={
                    <div className="glass-panel p-6 text-center text-white/50">
                      Could not parse this file. Check the markdown format and try again.
                    </div>
                  }
                >
                  <RoutineUploader />
                </ErrorBoundary>
              </motion.div>
            ) : currentView === 'routine-overview' && currentRoutine ? (
              <RoutineOverviewView />
            ) : currentView === 'active-session' ? (
              <ActiveSessionView />
            ) : currentView === 'history' ? (
              <HistoryView />
            ) : currentView === 'stats' ? (
              <StatsView />
            ) : (
              <motion.div
                key="unknown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-grow flex flex-col items-center justify-center py-40 text-center"
              >
                <p className="text-zinc-700 font-black uppercase tracking-widest text-sm">{currentView}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Floating Glass Control Center */}
        <div className="fixed bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black/90 via-black/40 to-transparent backdrop-blur-xl z-[var(--z-nav)] pointer-events-none" />
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[var(--z-nav)] w-[calc(100%-48px)] max-w-[420px] pb-[env(safe-area-inset-bottom)]">
          <nav role="navigation" className="relative group p-1.5 glass-panel rounded-[var(--radius-xl)] border-white/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
             <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-3xl rounded-[var(--radius-xl)] pointer-events-none" />
             <div className="absolute inset-0 bg-blue-600/20 blur-[var(--blur-ambient)] rounded-[var(--radius-xl)] opacity-60 group-hover:opacity-100 transition-opacity" />
             <div className="absolute inset-0 -z-10 bg-indigo-500/10 blur-[var(--blur-xl)] rounded-[var(--radius-xl)] group-hover:bg-indigo-500/20 transition-colors" />
             <div className="relative flex justify-between p-2">
                <button
                  onClick={() => handleNavClick('uploader')}
                  aria-label="Import routine"
                  aria-current={currentView === 'uploader' ? 'page' : undefined}
                  className={cn(
                    "w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center transition-colors transition-shadow duration-200 cursor-pointer relative",
                    currentView === 'uploader'
                      ? "bg-white text-black shadow-lg"
                      : "text-white/40 hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Plus className="w-6 h-6" />
                </button>
                <button
                   onClick={() => handleNavClick('routine-overview')}
                   aria-label="Overview"
                   aria-current={currentView === 'routine-overview' || currentView === 'active-session' ? 'page' : undefined}
                   className={cn(
                    "w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center transition-colors transition-shadow duration-200 cursor-pointer relative",
                    currentView === 'routine-overview' || currentView === 'active-session'
                      ? "bg-white text-black shadow-lg"
                      : "text-white/40 hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Dumbbell className="w-6 h-6" />
                </button>
                <button
                   onClick={() => handleNavClick('history')}
                   aria-label="History"
                   aria-current={currentView === 'history' ? 'page' : undefined}
                   className={cn(
                    "w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center transition-colors transition-shadow duration-200 cursor-pointer relative",
                    currentView === 'history'
                      ? "bg-white text-black shadow-lg"
                      : "text-white/40 hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Calendar className="w-6 h-6" />
                </button>
                <button
                   onClick={() => handleNavClick('stats')}
                   aria-label="Stats"
                   aria-current={currentView === 'stats' ? 'page' : undefined}
                   className={cn(
                    "w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center transition-colors transition-shadow duration-200 cursor-pointer relative",
                    currentView === 'stats'
                      ? "bg-white text-black shadow-lg"
                      : "text-white/40 hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <TrendingUp className="w-6 h-6" />
                </button>
             </div>
          </nav>
        </div>
      </div>

      {/* Overlay sheets */}
      <AnimatePresence>
        {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSearch && <SearchSheet onClose={() => setShowSearch(false)} />}
      </AnimatePresence>
    </main>
  );
}
