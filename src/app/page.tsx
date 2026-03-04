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
import { BottomNav } from '@/components/workout/BottomNav';
import {
  Search,
  User,
  Dumbbell,
} from 'lucide-react';
import { WorkoutView } from '@/types/workout';
import { useHydration } from '@/hooks/useHydration';
import { useStoragePersist } from '@/hooks/useStoragePersist';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  const [confirmNewRoutine, setConfirmNewRoutine] = useState(false);

  useStoragePersist();

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
      setConfirmNewRoutine(true);
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

        {/* Bottom Navigation with Floating Action Button */}
        <BottomNav currentView={currentView} onNavigate={handleNavClick} />
      </div>

      {/* Overlay sheets */}
      <AnimatePresence>
        {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSearch && <SearchSheet onClose={() => setShowSearch(false)} />}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmNewRoutine}
        title="Start New Routine?"
        message="Your current routine will be replaced. Workout history is preserved."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={() => { resetAll(); setConfirmNewRoutine(false); }}
        onCancel={() => setConfirmNewRoutine(false)}
      />
    </main>
  );
}
