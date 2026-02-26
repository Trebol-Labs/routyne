'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RoutineUploader } from '@/components/workout/RoutineUploader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { Button } from '@/components/ui/button';
import { RoutineOverviewView } from '@/components/workout/views/RoutineOverviewView';
import { ActiveSessionView } from '@/components/workout/views/ActiveSessionView';
import { HistoryView } from '@/components/workout/views/HistoryView';
import {
  Plus,
  Calendar,
  Search,
  TrendingUp,
  Activity,
  User,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutView } from '@/types/workout';
import { useWakeLock } from '@/hooks/useWakeLock';

export default function Home() {
  const {
    currentRoutine,
    currentView,
    setCurrentView,
    resetAll,
  } = useWorkoutStore();

  // Screen Wake Lock during active sessions
  useWakeLock(currentView === 'active-session');

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
      <div className="max-w-screen-md mx-auto min-h-screen flex flex-col relative px-4 sm:px-0">

        {/* Apple Liquid Glass Header */}
        <header className="sticky top-4 z-50 mt-4 px-6 py-4 flex items-center justify-between glass-panel rounded-[2.5rem] border-white/10 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="relative group">
               <div className="absolute inset-0 bg-blue-600 blur-[30px] opacity-40 group-hover:opacity-80 transition-opacity" />
               <div className="relative w-12 h-12 rounded-[1.2rem] bg-gradient-to-tr from-white/20 to-white/5 p-px backdrop-blur-3xl shadow-2xl">
                  <div className="w-full h-full rounded-[1.1rem] bg-black/40 flex items-center justify-center border border-white/5">
                    <Activity className="text-white w-7 h-7 animate-pulse" />
                  </div>
               </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black tracking-tighter leading-none text-white tracking-[-0.05em]">ROUTYNE</h2>
              <div className="flex items-center gap-2 mt-1.5 pl-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <p className="text-[11px] text-white/20 font-black uppercase tracking-[0.3em]">OFFLINE READY</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="w-11 h-11 rounded-[1.2rem] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition-all">
              <Search className="w-5.5 h-5.5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-11 h-11 rounded-[1.2rem] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition-all">
              <User className="w-5.5 h-5.5" />
            </Button>
          </div>
        </header>

        <div className="flex-grow pt-10 pb-16">
          <AnimatePresence mode="wait">
            {currentView === 'uploader' ? (
              <motion.div
                key="uploader"
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -40 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                className="flex-grow h-full flex items-center justify-center"
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
            ) : (
               <motion.div
                key="mock"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-grow flex flex-col items-center justify-center py-40 space-y-6 text-center"
              >
                <Activity className="w-20 h-20 text-white/10 animate-pulse" />
                <div>
                   <h2 className="text-3xl font-black text-white/40 tracking-tighter uppercase">{currentView} VIEW</h2>
                   <p className="text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2">Coming Soon in v2.1</p>
                </div>
                <Button
                  onClick={() => setCurrentView('routine-overview')}
                  variant="ghost"
                  className="text-blue-400 font-black uppercase tracking-widest mt-8"
                >
                  Back to routine
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Floating Glass Control Center */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-48px)] max-w-[420px]">
          <nav className="relative group p-1.5 glass-panel rounded-[3rem] border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
             <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="relative flex justify-between p-2">
                <div
                  onClick={() => handleNavClick('uploader')}
                  className={cn(
                    "w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all hover:scale-105 active:scale-90 cursor-pointer",
                    currentView === 'uploader' ? "bg-white text-black shadow-2xl" : "text-white/30 hover:bg-white/5"
                  )}
                >
                  <Plus className="w-7 h-7" />
                </div>
                <div
                   onClick={() => handleNavClick('routine-overview')}
                   className={cn(
                    "w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all hover:scale-105 active:scale-90 cursor-pointer",
                    currentView === 'routine-overview' || currentView === 'active-session' ? "bg-white text-black shadow-2xl" : "text-white/30 hover:bg-white/5"
                  )}
                >
                  <Dumbbell className="w-7 h-7" />
                </div>
                <div
                   onClick={() => handleNavClick('history')}
                   className={cn(
                    "w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all hover:scale-105 active:scale-90 cursor-pointer",
                    currentView === 'history' ? "bg-white text-black shadow-2xl" : "text-white/30 hover:bg-white/5"
                  )}
                >
                  <Calendar className="w-7 h-7" />
                </div>
                <div
                   onClick={() => handleNavClick('stats')}
                   className={cn(
                    "w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all hover:scale-105 active:scale-90 cursor-pointer",
                    currentView === 'stats' ? "bg-white text-black shadow-2xl" : "text-white/30 hover:bg-white/5"
                  )}
                >
                  <TrendingUp className="w-7 h-7" />
                </div>
             </div>
          </nav>
        </div>
      </div>
    </main>
  );
}
