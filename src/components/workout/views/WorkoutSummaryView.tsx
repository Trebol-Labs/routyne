'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, CheckCircle2, Share2, History, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ShareCardSheet } from '@/components/workout/overlays/ShareCardSheet';
import { CoachSheet } from '@/components/workout/overlays/CoachSheet';
import { COACH_ENABLED } from '@/lib/feature-flags';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { WorkoutSummaryBreakdown } from '@/components/workout/WorkoutSummaryBreakdown';
import type { WorkoutSummary } from '@/types/workout';

export function WorkoutSummaryView() {
  const { lastWorkoutSummary, setCurrentView, profile, history } = useWorkoutStore();
  const { t } = useI18n();
  const [showShareCard, setShowShareCard] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const isFirstWorkout = history.length === 1;

  useEffect(() => {
    if (!lastWorkoutSummary) {
      setCurrentView('history');
    }
  }, [lastWorkoutSummary, setCurrentView]);

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
  const { entry } = summary;
  const unit = profile.weightUnit;
  const hasPRs = summary.newPRs.length > 0;

  return (
    <>
      <motion.div
        key="workout-summary"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-8 pb-10"
      >
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
                {t.summary.titlePR}
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
                {t.summary.titleWorkout}
              </h2>
            </>
          )}
          <p className="text-white/50 text-sm font-bold uppercase tracking-[0.18em] font-display">
            {entry.sessionTitle}
          </p>
        </div>

        <WorkoutSummaryBreakdown
          summary={summary}
          weightUnit={unit}
          showFirstWorkout={isFirstWorkout}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="space-y-3 pt-2"
        >
          <Button
            className="active-glass-btn w-full h-12 text-sm font-black uppercase tracking-widest font-display"
            onClick={() => setCurrentView('history')}
          >
            <History className="w-4 h-4 mr-2" />
            {t.summary.viewHistory}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-sm font-black uppercase tracking-widest font-display border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => setCurrentView('routine-overview')}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t.summary.backToRoutine}
          </Button>

          <Button
            variant="ghost"
            className="w-full h-12 text-sm font-bold text-white/40 hover:text-white/70 uppercase tracking-widest font-display"
            onClick={() => setShowShareCard(true)}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {t.summary.share}
          </Button>

          {COACH_ENABLED && (
            <Button
              variant="ghost"
              className="w-full h-12 text-sm font-bold text-indigo-400/70 hover:text-indigo-300 uppercase tracking-widest font-display"
              onClick={() => setShowCoach(true)}
            >
              🤖 {t.summary.askCoach}
            </Button>
          )}
        </motion.div>
      </motion.div>

      {showShareCard && (
        <ShareCardSheet
          summary={summary}
          weightUnit={unit}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {showCoach && (
        <CoachSheet onClose={() => setShowCoach(false)} />
      )}
    </>
  );
}
