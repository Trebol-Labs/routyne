'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Dumbbell, CheckCircle2, BarChart2, Share2, History, ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ShareCardSheet } from '@/components/workout/overlays/ShareCardSheet';
import { CoachSheet } from '@/components/workout/overlays/CoachSheet';
import type { ExerciseVolume, SetDetail, WorkoutSummary } from '@/types/workout';

// ── Duration formatter ────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accentClass?: string;
}

function StatCard({ icon, label, value, sub, accentClass = 'text-white' }: StatCardProps) {
  return (
    <div className="glass-panel rounded-2xl p-4 border-white/10 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-white/40">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.18em] font-display">{label}</span>
      </div>
      <p className={`text-2xl font-black tracking-tighter font-display ${accentClass}`}>{value}</p>
      {sub && <p className="text-xs text-white/30 font-medium">{sub}</p>}
    </div>
  );
}

interface SetChipProps {
  detail: SetDetail;
  unit: string;
}

function SetChip({ detail, unit }: SetChipProps) {
  const label = detail.weight && detail.weight > 0
    ? `${detail.repsDone} @ ${detail.weight}${unit}`
    : `${detail.repsDone} reps`;
  return (
    <span className="inline-block px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold tracking-wide font-display">
      {label}
    </span>
  );
}

interface ExerciseRowProps {
  ev: ExerciseVolume;
  unit: string;
}

function ExerciseRow({ ev, unit }: ExerciseRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-white font-bold text-sm truncate flex-1">{ev.cleanName}</p>
        <p className="text-white/40 text-xs font-bold shrink-0 font-display">
          {ev.setsCompleted} {ev.setsCompleted === 1 ? 'set' : 'sets'}
          {ev.totalVolume > 0 ? ` · ${ev.totalVolume.toFixed(0)}${unit}` : ''}
        </p>
      </div>
      {ev.setDetails && ev.setDetails.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ev.setDetails
            .slice()
            .sort((a, b) => a.setIdx - b.setIdx)
            .map((d) => (
              <SetChip key={d.setIdx} detail={d} unit={unit} />
            ))}
        </div>
      )}
    </div>
  );
}

// ── Volume delta badge ────────────────────────────────────────────────────────

function VolumeDeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <div className="flex items-center gap-1 text-zinc-400">
        <Minus className="w-3 h-3" />
        <span className="text-xs font-bold">First time!</span>
      </div>
    );
  }
  const isPos = pct >= 0;
  return (
    <div className={`flex items-center gap-1 ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="text-xs font-bold">
        {isPos ? '+' : ''}{pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WorkoutSummaryView() {
  const { lastWorkoutSummary, setCurrentView, profile, history } = useWorkoutStore();
  const [showShareCard, setShowShareCard] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const coachEnabled = !!process.env.NEXT_PUBLIC_COACH_ENABLED;
  const isFirstWorkout = history.length === 1;

  // Guard: no summary — redirect to history
  useEffect(() => {
    if (!lastWorkoutSummary) {
      setCurrentView('history');
    }
  }, [lastWorkoutSummary, setCurrentView]);

  // Confetti on mount if PRs exist — capture value at mount time via ref so the
  // effect truly runs once and React Compiler can optimize this component.
  const hasPRsOnMount = useRef(!!lastWorkoutSummary && lastWorkoutSummary.newPRs.length > 0);
  useEffect(() => {
    if (hasPRsOnMount.current) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.4 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4FC3F7'],
      });
    }
  }, []);

  if (!lastWorkoutSummary) return null;

  const summary: WorkoutSummary = lastWorkoutSummary;
  const { entry, durationSeconds, totalSets, newPRs, volumeDeltaPercent } = summary;
  const unit = profile.weightUnit;
  const hasPRs = newPRs.length > 0;


  return (
    <>
    <motion.div
      key="workout-summary"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-8 pb-10"
    >
      {/* ── 1. Celebration header ── */}
      <div className="text-center space-y-3 pt-4">
        {hasPRs ? (
          <>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.25)]">
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
            </motion.div>
            <h2
              className="text-3xl font-black tracking-tighter font-display"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              New Personal Record!
            </h2>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.2)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </motion.div>
            <h2
              className="text-3xl font-black tracking-tighter font-display"
              style={{
                background: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Workout Complete
            </h2>
          </>
        )}
        <p className="text-white/50 text-sm font-bold uppercase tracking-[0.18em] font-display">
          {entry.sessionTitle}
        </p>
      </div>

      {/* ── 2. Stats grid ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Duration"
          value={formatDuration(durationSeconds)}
        />
        <StatCard
          icon={<Dumbbell className="w-3.5 h-3.5" />}
          label="Total Volume"
          value={`${entry.totalVolume.toFixed(0)} ${unit}`}
        />
        <StatCard
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="Sets"
          value={`${totalSets} sets`}
        />
        <div className="glass-panel rounded-2xl p-4 border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/40">
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] font-display">vs Last</span>
          </div>
          <div className="mt-1">
            <VolumeDeltaBadge pct={volumeDeltaPercent} />
          </div>
        </div>
      </div>

      {/* ── 3. PR section ── */}
      {hasPRs && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-amber-400 rounded-full shadow-[0_0_16px_rgba(251,191,36,0.6)]" />
            <h3 className="text-white font-black text-xl tracking-tighter uppercase font-display">
              Personal Records
            </h3>
          </div>
          <div className="glass-panel rounded-2xl border-amber-400/20 p-4 space-y-3">
            {newPRs.map((pr, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{pr.exerciseName}</p>
                    {pr.isNewPR && (
                      <span className="inline-block text-[9px] font-black uppercase tracking-widest text-amber-400 font-display">
                        New PR
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  {pr.weightDelta !== 0 && (
                    <span className="text-xs font-bold text-emerald-400">
                      {pr.weightDelta > 0 ? '+' : ''}{pr.weightDelta.toFixed(1)}{unit}
                    </span>
                  )}
                  {pr.repsDelta !== 0 && (
                    <span className="text-xs font-bold text-emerald-400">
                      {pr.repsDelta > 0 ? '+' : ''}{pr.repsDelta} reps
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 4. Exercise breakdown ── */}
      {entry.volumeData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: hasPRs ? 0.45 : 0.3, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_16px_rgba(99,102,241,0.5)]" />
            <h3 className="text-white font-black text-xl tracking-tighter uppercase font-display">
              Exercises
            </h3>
          </div>
          <div className="glass-panel rounded-2xl border-white/10 p-4 space-y-4 divide-y divide-white/5">
            {entry.volumeData.map((ev, idx) => (
              <div key={ev.exerciseId} className={idx > 0 ? 'pt-4' : ''}>
                <ExerciseRow ev={ev} unit={unit} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 5. First-workout celebration ── */}
      {isFirstWorkout && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="glass-panel rounded-2xl border-amber-400/20 p-4 text-center space-y-1"
        >
          <p className="text-xl font-black tracking-tight text-white font-display">🎉 ¡Primer entrenamiento!</p>
          <p className="text-sm text-white/50 font-medium">Comparte tu logro con el mundo</p>
        </motion.div>
      )}

      {/* ── 6. Action buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-3 pt-2"
      >
        {/* Primary */}
        <Button
          className="active-glass-btn w-full h-12 text-sm font-black uppercase tracking-widest font-display"
          onClick={() => setCurrentView('history')}
        >
          <History className="w-4 h-4 mr-2" />
          View History
        </Button>

        {/* Secondary */}
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-black uppercase tracking-widest font-display border-white/10 bg-white/5 text-white hover:bg-white/10"
          onClick={() => setCurrentView('routine-overview')}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Routine
        </Button>

        {/* Ghost share */}
        <Button
          variant="ghost"
          className="w-full h-12 text-sm font-bold text-white/40 hover:text-white/70 uppercase tracking-widest font-display"
          onClick={() => setShowShareCard(true)}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Workout
        </Button>

        {/* AI Coach CTA — only shown when coach is configured */}
        {coachEnabled && (
          <Button
            variant="ghost"
            className="w-full h-12 text-sm font-bold text-indigo-400/70 hover:text-indigo-300 uppercase tracking-widest font-display"
            onClick={() => setShowCoach(true)}
          >
            🤖 Ask AI Coach
          </Button>
        )}
      </motion.div>
    </motion.div>

    <AnimatePresence>
      {showShareCard && (
        <ShareCardSheet
          summary={summary}
          weightUnit={unit}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </AnimatePresence>
    <AnimatePresence>
      {showCoach && <CoachSheet onClose={() => setShowCoach(false)} />}
    </AnimatePresence>
    </>
  );
}
