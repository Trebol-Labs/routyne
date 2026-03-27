'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { RoutineUploader } from '@/components/workout/RoutineUploader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { RoutineOverviewView } from '@/components/workout/views/RoutineOverviewView';
import { ActiveSessionView } from '@/components/workout/views/ActiveSessionView';
import { HistoryView } from '@/components/workout/views/HistoryView';
import { StatsView } from '@/components/workout/views/StatsView';
import { WorkoutSummaryView } from '@/components/workout/views/WorkoutSummaryView';
import { RoutineBuilderView } from '@/components/workout/views/RoutineBuilderView';
import { RoutineManagerView } from '@/components/workout/views/RoutineManagerView';
import { ProfileSheet } from '@/components/workout/overlays/ProfileSheet';
import { SearchSheet } from '@/components/workout/overlays/SearchSheet';
import { AuthSheet } from '@/components/workout/overlays/AuthSheet';
import { CoachSheet } from '@/components/workout/overlays/CoachSheet';
import { TopHeader } from '@/components/workout/TopHeader';
import { BottomNav } from '@/components/workout/BottomNav';
import { WorkoutView } from '@/types/workout';
import { useHydration } from '@/hooks/useHydration';
import { useStoragePersist } from '@/hooks/useStoragePersist';
import { useSync } from '@/hooks/useSync';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AchievementToast } from '@/components/workout/AchievementToast';

export default function Home() {
  const isReady = useHydration();

  const {
    currentRoutine,
    currentView,
    setCurrentView,
    resetAll,
    pendingAchievements,
    clearPendingAchievements,
  } = useWorkoutStore();

  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [confirmNewRoutine, setConfirmNewRoutine] = useState(false);

  useStoragePersist();
  const { status: syncStatus, pendingCount } = useSync();

  if (!isReady) {
    return (
      <main className="min-h-[100dvh] liquid-bg-dark flex items-center justify-center">
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
    <main className="min-h-[100dvh] liquid-bg-dark text-zinc-100 selection:bg-blue-500/40 font-sans">
      <div className="max-w-screen-md mx-auto h-dvh flex flex-col relative px-4">

        {/* Top Header */}
        <TopHeader
          onSearchClick={() => setShowSearch(true)}
          onProfileClick={() => setShowProfile(true)}
          onCloudClick={process.env.NEXT_PUBLIC_SUPABASE_URL ? () => setShowAuth(true) : undefined}
          syncStatus={syncStatus}
          pendingCount={pendingCount}
        />

        <div className="flex-grow pt-4 pb-[var(--space-nav-clear)] flex flex-col">
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
                className="flex-1 flex flex-col justify-center overflow-y-auto"
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

            ) : currentView === 'routine-builder' ? (
              <motion.div
                key="routine-builder"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="flex-1 flex flex-col overflow-y-auto"
                id="main-content"
              >
                <RoutineBuilderView />
              </motion.div>

            ) : currentView === 'routine-manager' ? (
              <motion.div
                key="routine-manager"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="flex-1 flex flex-col overflow-y-auto"
                id="main-content"
              >
                <RoutineManagerView />
              </motion.div>

            ) : currentView === 'routine-overview' && currentRoutine ? (
              <RoutineOverviewView />

            ) : currentView === 'active-session' ? (
              <ActiveSessionView />

            ) : currentView === 'workout-summary' ? (
              <motion.div
                key="workout-summary"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="flex-1 flex flex-col overflow-y-auto"
                id="main-content"
              >
                <WorkoutSummaryView />
              </motion.div>

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

        {/* Bottom Navigation */}
        <BottomNav
          currentView={currentView}
          onNavigate={handleNavClick}
          hasRoutine={!!currentRoutine}
          onCoachClick={process.env.NEXT_PUBLIC_COACH_ENABLED ? () => setShowCoach(true) : undefined}
        />
      </div>

      {/* Overlay sheets */}
      <AnimatePresence>
        {showProfile && (
          <ProfileSheet
            onClose={() => setShowProfile(false)}
            onOpenSync={process.env.NEXT_PUBLIC_SUPABASE_URL ? () => { setShowProfile(false); setShowAuth(true); } : undefined}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSearch && <SearchSheet onClose={() => setShowSearch(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAuth && <AuthSheet onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCoach && <CoachSheet onClose={() => setShowCoach(false)} />}
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

      <AchievementToast
        achievementIds={pendingAchievements}
        onDismiss={clearPendingAchievements}
      />
    </main>
  );
}
