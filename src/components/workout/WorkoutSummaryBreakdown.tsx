'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { cn } from '@/lib/utils';
import type { ExerciseVolume, SetDetail, WorkoutSummary } from '@/types/workout';
import { BarChart2, CheckCircle2, Clock, Dumbbell, Minus, TrendingDown, TrendingUp, Trophy } from 'lucide-react';

interface WorkoutSummaryBreakdownProps {
  summary: WorkoutSummary;
  weightUnit: string;
  showFirstWorkout?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

interface StatCardProps {
  icon: ReactNode;
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

function formatSetType(setType: SetDetail['setType'], language: 'es' | 'en'): string | null {
  if (!setType) return null;
  switch (setType) {
    case 'warmup':
      return language === 'en' ? 'Warm-up' : 'Calentamiento';
    case 'working':
      return language === 'en' ? 'Working' : 'Trabajo';
    case 'dropset':
      return language === 'en' ? 'Drop set' : 'Drop set';
    case 'amrap':
      return 'AMRAP';
    case 'failure':
      return language === 'en' ? 'Failure' : 'Fallo';
    default:
      return null;
  }
}

function SetChip({ detail, unit }: { detail: SetDetail; unit: string }) {
  const { language, t } = useI18n();
  const parts: string[] = [];
  const weightLabel = detail.weight && detail.weight > 0 ? `@ ${detail.weight}${unit}` : null;

  if (weightLabel) {
    parts.push(`${detail.repsDone} ${weightLabel}`);
  } else {
    parts.push(`${detail.repsDone} ${t.summary.reps}`);
  }

  if (detail.rpe != null) {
    parts.push(`RPE ${detail.rpe}`);
  }
  if (detail.rir != null) {
    parts.push(`RIR ${detail.rir >= 0 ? detail.rir : 0}`);
  }

  const typeLabel = formatSetType(detail.setType, language);
  if (typeLabel) {
    parts.push(typeLabel);
  }

  if (detail.notes) {
    parts.push(detail.notes.slice(0, 16));
  }

  return (
    <span className="inline-flex max-w-full flex-col gap-0.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-left text-[10px] font-bold tracking-wide font-display text-white/60">
      <span className="leading-none">{parts[0]}</span>
      {parts.length > 1 && (
        <span className="max-w-[10rem] truncate text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
          {parts.slice(1).join(' · ')}
        </span>
      )}
    </span>
  );
}

function ExerciseRow({ ev, unit }: { ev: ExerciseVolume; unit: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-white font-bold text-sm truncate flex-1">{ev.cleanName}</p>
        <p className="text-white/40 text-xs font-bold shrink-0 font-display">
          {ev.setsCompleted} {ev.setsCompleted === 1 ? t.summary.set : t.summary.setPlural}
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

function VolumeDeltaBadge({ pct }: { pct: number | null }) {
  const { t } = useI18n();
  if (pct === null) {
    return (
      <div className="flex items-center gap-1 text-zinc-400">
        <Minus className="w-3 h-3" />
        <span className="text-xs font-bold">{t.summary.firstTime}</span>
      </div>
    );
  }
  const isPos = pct >= 0;
  return (
    <div className={cn('flex items-center gap-1', isPos ? 'text-emerald-400' : 'text-red-400')}>
      {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="text-xs font-bold">
        {isPos ? '+' : ''}{pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function WorkoutSummaryBreakdown({
  summary,
  weightUnit,
  showFirstWorkout = false,
}: WorkoutSummaryBreakdownProps) {
  const { t } = useI18n();
  const { entry, durationSeconds, totalSets, newPRs, volumeDeltaPercent } = summary;
  const hasPRs = newPRs.length > 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Clock className="w-3.5 h-3.5" />}
          label={t.summary.duration}
          value={formatDuration(durationSeconds)}
        />
        <StatCard
          icon={<Dumbbell className="w-3.5 h-3.5" />}
          label={t.summary.totalVolume}
          value={`${entry.totalVolume.toFixed(0)} ${weightUnit}`}
        />
        <StatCard
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label={t.summary.sets}
          value={`${totalSets} ${t.summary.setPlural}`}
        />
        <div className="glass-panel rounded-2xl p-4 border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/40">
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] font-display">
              {t.summary.versusLast}
            </span>
          </div>
          <div className="mt-1">
            <VolumeDeltaBadge pct={volumeDeltaPercent} />
          </div>
        </div>
      </div>

      {hasPRs && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-amber-400 rounded-full shadow-[0_0_16px_rgba(251,191,36,0.6)]" />
            <h3 className="text-white font-black text-xl tracking-tighter uppercase font-display">
              {t.summary.prs}
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
                        {t.summary.newPr}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  {pr.weightDelta !== 0 && (
                    <span className="text-xs font-bold text-emerald-400">
                      {pr.weightDelta > 0 ? '+' : ''}{pr.weightDelta.toFixed(1)}{weightUnit}
                    </span>
                  )}
                  {pr.repsDelta !== 0 && (
                    <span className="text-xs font-bold text-emerald-400">
                      {pr.repsDelta > 0 ? '+' : ''}{pr.repsDelta} {t.summary.reps}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entry.volumeData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_16px_rgba(99,102,241,0.5)]" />
            <h3 className="text-white font-black text-xl tracking-tighter uppercase font-display">
              {t.summary.exercises}
            </h3>
          </div>
          <div className="glass-panel rounded-2xl border-white/10 p-4 space-y-4 divide-y divide-white/5">
            {entry.volumeData.map((ev, idx) => (
              <div key={ev.exerciseId} className={idx > 0 ? 'pt-4' : ''}>
                <ExerciseRow ev={ev} unit={weightUnit} />
              </div>
            ))}
          </div>
        </div>
      )}

      {showFirstWorkout && (
        <div className="glass-panel rounded-2xl border-amber-400/20 p-4 text-center space-y-1">
          <p className="text-xl font-black tracking-tight text-white font-display">{t.summary.firstWorkoutTitle}</p>
          <p className="text-sm text-white/50 font-medium">{t.summary.firstWorkoutBody}</p>
        </div>
      )}
    </div>
  );
}
