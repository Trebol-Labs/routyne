'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { RoutineUploader } from '@/components/workout/RoutineUploader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Plus, 
  Calendar, 
  Search, 
  LayoutGrid,
  TrendingUp,
  MoreVertical,
  Activity,
  User,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Dumbbell,
  Circle,
  Zap,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutView, ParsedExercise } from '@/types/workout';
import { useWakeLock } from '@/hooks/useWakeLock';
import { RestTimer } from '@/components/workout/RestTimer';

export default function Home() {
  const { 
    currentRoutine, 
    currentView, 
    setCurrentView,
    activeSessionIdx, 
    startSession,
    setCompletion,
    toggleSetCompletion,
    finishSession,
    resetAll,
    history
  } = useWorkoutStore();
  
  const [sessionPickerIdx, setSessionPickerIdx] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);

  // Screen Wake Lock during active sessions
  useWakeLock(currentView === 'active-session');

  const activeSession = currentRoutine?.sessions[activeSessionIdx ?? 0];
  const pickerSession = currentRoutine?.sessions[sessionPickerIdx];

  const handleNavClick = (view: WorkoutView) => {
    if (view === 'uploader' && currentRoutine) {
      if (confirm('Start a new routine? Current data will be lost.')) {
        resetAll();
      }
      return;
    }
    setCurrentView(view);
  };

  const handleSetCompletion = (sessionIdx: number, exerciseId: string, setIdx: number, restSeconds: number) => {
    const isCompleted = setCompletion[`${sessionIdx}-${exerciseId}-${setIdx}`]?.completed;
    toggleSetCompletion(sessionIdx, exerciseId, setIdx);
    
    // Auto-trigger rest timer if marking as complete and not already completed
    if (!isCompleted) {
      setRestDuration(restSeconds || 90);
      setShowRestTimer(true);
    }
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
              <motion.div
                key="routine"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-16"
              >
                {/* Routine Hero Section */}
                <div className="space-y-10">
                  <div className="relative group p-10 rounded-[3rem] glass-panel border border-white/10 overflow-hidden shadow-2xl">
                    <div className="absolute top-[-50px] right-[-50px] p-6 opacity-5 group-hover:opacity-20 transition-all duration-1000 scale-150 group-hover:rotate-45">
                       <Dumbbell className="w-64 h-64 text-white" />
                    </div>
                    
                    <div className="relative space-y-6">
                      <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                         <TrendingUp className="w-4 h-4 text-blue-400" />
                         <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.25em]">Hypertrophy Engine</span>
                      </div>
                      
                      <div className="space-y-4 text-center">
                        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-liquid leading-[0.9] uppercase">
                          {currentRoutine.title}
                        </h1>
                        <p className="text-white/40 text-lg font-bold tracking-tight px-4">
                          {currentRoutine.sessions.length} training cycles synchronized.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6">
                         <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-[1.5rem] border border-white/5 shadow-inner">
                            <Clock className="w-5 h-5 text-indigo-400" />
                            <span className="text-sm font-black text-white/80 uppercase tracking-widest">75m EST</span>
                         </div>
                         <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-[1.5rem] border border-white/5 shadow-inner">
                            <LayoutGrid className="w-5 h-5 text-emerald-400" />
                            <span className="text-sm font-black text-white/80 uppercase tracking-widest">{pickerSession?.exercises.length} EXERCISES</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Session Picker */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-4 sm:px-2">
                       <h3 className="text-[12px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Phases</h3>
                       <button className="text-white/10 hover:text-white transition-all" title="More options">
                          <MoreVertical className="w-5 h-5" />
    button             </button>
                    </div>
                    
                    <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 sm:-mx-2 sm:px-2 pt-2">
                      {currentRoutine.sessions.map((session, idx) => (
                        <button
                          key={session.id}
                          onClick={() => setSessionPickerIdx(idx)}
                          className={cn(
                            "shrink-0 relative group flex flex-col items-center justify-center min-w-[120px] h-[150px] rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
                            sessionPickerIdx === idx
                              ? "glass-panel active-glass-btn scale-[1.05] -translate-y-2 z-10"
                              : "bg-white/5 border-white/[0.03] text-white/20 hover:border-white/10 hover:bg-white/[0.08]"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-2xl mb-4",
                            sessionPickerIdx === idx ? "bg-white/20 scale-110" : "bg-black/30"
                          )}>
                             <span className={cn(
                               "text-lg font-black tracking-tighter",
                               sessionPickerIdx === idx ? "text-white" : "text-white/10"
                             )}>{idx + 1}</span>
                          </div>
                          
                          <h4 className={cn(
                            "text-xs font-black tracking-[0.2em] uppercase leading-none",
                            sessionPickerIdx === idx ? "text-white/80" : "text-white/10"
                          )}>
                            Day
                          </h4>

                          {sessionPickerIdx === idx && (
                             <motion.div 
                               layoutId="activePickerIndicator"
                               className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white shadow-[0_0_20px_white] border-2 border-blue-500 z-50"
                             />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-2">
                    <Button 
                      onClick={() => startSession(sessionPickerIdx)}
                      className="w-full active-glass-btn hover:brightness-125 text-white rounded-[2.5rem] py-10 h-auto font-black text-2xl shadow-[0_20px_60px_-15px_rgba(59,130,246,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-6 group"
                    >
                      <Play className="w-8 h-8 fill-white group-hover:scale-110 transition-transform" />
                      <span>START SESSION {sessionPickerIdx + 1}</span>
                    </Button>
                  </div>
                </div>

                {/* Exercises Sequence Overview */}
                <div className="space-y-12 pt-10">
                  <div className="flex items-center justify-between px-4 sm:px-2">
                    <div className="flex items-center gap-5">
                       <div className="w-2 h-10 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                       <h3 className="text-white font-black text-3xl tracking-tighter uppercase">
                         Sequence
                       </h3>
                    </div>
                  </div>

                  <div className="grid gap-8 px-2 sm:px-0">
                    {pickerSession?.exercises.map((exercise, index) => (
                      <ExerciseCard 
                        key={exercise.id} 
                        exercise={exercise} 
                        index={index} 
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : currentView === 'active-session' && activeSession ? (
              <motion.div
                key="active-session"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12 pb-20 px-2 sm:px-0"
              >
                <div className="flex items-center justify-between px-2 sm:px-0">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => setCurrentView('routine-overview')}
                      className="rounded-full w-12 h-12 glass-panel border-white/10 p-0"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </Button>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{activeSession.title}</h2>
                      <div className="flex items-center gap-2 mt-2">
                         <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                            <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">WAKE LOCK ON</span>
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowRestTimer(true)}
                    className="w-12 h-12 rounded-full glass-panel border-white/10 bg-blue-600/5"
                  >
                     <Clock className="w-6 h-6 text-blue-400" />
                  </Button>
                </div>

                <div className="grid gap-12">
                   {activeSession.exercises.map((exercise) => (
                        <div key={exercise.id} className="space-y-6">
                          <div className="flex items-center justify-between px-4 sm:px-2">
                            <h3 className="text-xl font-black text-white tracking-tighter uppercase">{exercise.cleanName}</h3>
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                               {exercise.sets} Sets / {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''} Reps
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {Array.from({ length: exercise.sets }).map((_, setIdx) => (
                                <SetRow 
                                  key={setIdx}
                                  setIdx={setIdx}
                                  sessionIdx={activeSessionIdx!}
                                  exercise={exercise}
                                  isCompleted={!!setCompletion[`${activeSessionIdx}-${exercise.id}-${setIdx}`]?.completed}
                                  onComplete={() => handleSetCompletion(activeSessionIdx!, exercise.id, setIdx, exercise.restSeconds)}
                                />
                            ))}
                          </div>
                        </div>
                   ))}
                </div>

                <div className="px-2 sm:px-0">
                  <Button 
                    onClick={() => finishSession()}
                    className="w-full active-glass-btn hover:brightness-125 text-white rounded-[2.5rem] py-10 h-auto font-black text-2xl transition-all shadow-2xl flex items-center justify-center gap-6 group mt-10"
                  >
                    <CheckCircle2 className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                    <span>FINISH WORKOUT</span>
                  </Button>
                </div>
              </motion.div>
            ) : currentView === 'history' ? (
               <motion.div
                key="history"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
              >
                <div className="flex items-center gap-5">
                   <div className="w-2 h-10 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]" />
                   <h3 className="text-white font-black text-3xl tracking-tighter uppercase">
                     History
                   </h3>
                </div>

                {history.length === 0 ? (
                  <div className="py-20 text-center space-y-4 glass-panel rounded-[2.5rem] border-white/5">
                     <Calendar className="w-16 h-16 text-white/5 mx-auto" />
                     <p className="text-zinc-600 font-black uppercase tracking-widest text-sm">No workouts recorded yet</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {history.map((entry) => (
                      <div key={entry.id} className="glass-panel rounded-[2.5rem] p-6 border-white/10 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter">{entry.sessionTitle}</h4>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                              {new Date(entry.completedAt).toLocaleDateString()} at {new Date(entry.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                            Completed
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                           </div>
                           <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                             {entry.completedExercises.length} Exercises tracked
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
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

        {/* Floating Rest Timer */}
        <AnimatePresence>
          {showRestTimer && (
            <RestTimer 
              duration={restDuration} 
              onClose={() => setShowRestTimer(false)}
              onFinish={() => {
                // Potential haptic feedback call here
                if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
              }}
            />
          )}
        </AnimatePresence>

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

/**
 * Interactive Swipe-to-Complete Set Row component.
 */
interface SetRowProps {
  setIdx: number;
  sessionIdx: number;
  exercise: ParsedExercise;
  isCompleted: boolean;
  onComplete: () => void;
}

function SetRow({ setIdx, exercise, isCompleted, onComplete }: SetRowProps) {
  const x = useMotionValue(0);
  const swipeThreshold = 120;
  
  // Transform values for visual feedback during swipe
  const opacity = useTransform(x, [0, swipeThreshold], [0, 0.4]);
  const scale = useTransform(x, [0, swipeThreshold], [0.95, 1.05]);
  const color = useTransform(x, [0, swipeThreshold], ["rgba(16, 185, 129, 0)", "rgba(16, 185, 129, 0.3)"]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > swipeThreshold && !isCompleted) {
      onComplete();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem]">
      {/* Background layer that appears on swipe */}
      <motion.div 
        style={{ backgroundColor: color, opacity }}
        className="absolute inset-0 flex items-center pl-8 transition-colors duration-500"
      >
        <motion.div style={{ scale }}>
          <CheckCircle2 className="w-8 h-8 text-white" />
        </motion.div>
      </motion.div>

      {/* Main draggable set card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: isCompleted ? 0 : swipeThreshold + 40 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative glass-panel rounded-[2rem] p-6 flex items-center justify-between transition-all duration-700 border z-10",
          isCompleted ? "bg-emerald-500/10 border-emerald-500/20 translate-x-2" : "border-white/5 bg-zinc-950/40"
        )}
      >
        <div className="flex items-center gap-6">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all duration-700",
            isCompleted ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-white/5 text-white/20"
          )}>
            {setIdx + 1}
          </div>
          <div>
            <span className={cn(
              "text-lg font-black tracking-tight block leading-none transition-all duration-700",
              isCompleted ? "text-white/40 line-through" : "text-white"
            )}>SET {setIdx + 1}</span>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2 block">
               {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''} Reps
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {!isCompleted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                 <ChevronRight className="w-3 h-3 text-white/20 animate-pulse" />
                 <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">SWIPE</span>
              </div>
           )}
           <div className={cn(
             "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700",
             isCompleted ? "text-emerald-400" : "text-white/5"
           )}>
             {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
           </div>
        </div>
      </motion.div>
    </div>
  );
}
