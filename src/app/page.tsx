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
    history,
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
                <p className="text-[11px] text-white/20 font-black uppercase tracking-[0.3em] whitespace-nowrap">OFFLINE READY</p>
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

        <div className="flex-grow pt-10 pb-32">
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
            ) : currentView === 'stats' ? (
              <motion.div
                key="stats"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-10"
              >
                <div className="flex items-center gap-5">
                  <div className="w-2 h-10 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                  <h3 className="text-white font-black text-3xl tracking-tighter uppercase">Stats</h3>
                </div>

                {history.length === 0 ? (
                  <div className="glass-panel rounded-[2.5rem] p-10 border-white/5 text-center space-y-6">
                    <TrendingUp className="w-16 h-16 text-white/5 mx-auto" />
                    <div className="space-y-2">
                      <p className="text-white/40 font-black text-lg uppercase tracking-tighter">Your stats will appear here</p>
                      <p className="text-zinc-600 text-[11px] font-black uppercase tracking-[0.3em]">Complete a session to start tracking</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2 w-full">
                      {['Total Volume', 'Sessions', 'Exercises'].map((label) => (
                        <div key={label} className="px-3 py-2 bg-white/[0.03] border border-white/5 rounded-2xl text-center">
                          <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (() => {
                  const totalSessions = history.length;
                  const totalVolume = history.reduce((sum, e) => sum + e.totalVolume, 0);
                  const totalExercises = history.reduce((sum, e) => sum + e.volumeData.length, 0);
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: 'Sessions', value: String(totalSessions), color: 'text-blue-400' },
                          { label: 'Volume', value: totalVolume > 0 ? `${totalVolume.toLocaleString()}kg` : '—', color: 'text-indigo-400' },
                          { label: 'Exercises', value: String(totalExercises), color: 'text-emerald-400' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="glass-panel rounded-[2rem] p-4 border-white/5 text-center space-y-2">
                            <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em] px-1">Recent</h4>
                        {history.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="glass-panel rounded-[2rem] p-4 border-white/5 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-white/70 uppercase tracking-tighter truncate">{entry.sessionTitle}</p>
                              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-0.5">{entry.volumeData.length} exercises</p>
                            </div>
                            {entry.totalVolume > 0 && (
                              <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest shrink-0">
                                {entry.totalVolume.toLocaleString()}kg
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-center text-[10px] font-black text-white/10 uppercase tracking-[0.3em] pt-2">
                        Detailed charts — coming in v2.1
                      </p>
                    </div>
                  );
                })()}
              </motion.div>
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
