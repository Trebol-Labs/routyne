'use client';

import { useMemo } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { buildWorkoutSummary } from '@/lib/analytics/session-compare';
import type { HistoryEntry } from '@/types/workout';
import { WorkoutSummaryBreakdown } from '@/components/workout/WorkoutSummaryBreakdown';

interface HistorySessionDetailSheetProps {
  entry: HistoryEntry;
  history: HistoryEntry[];
  weightUnit: string;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}

function formatCompletedAt(date: Date, language: 'es' | 'en'): string {
  return date.toLocaleString(language === 'en' ? 'en-US' : 'es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function HistorySessionDetailSheet({
  entry,
  history,
  weightUnit,
  onClose,
}: HistorySessionDetailSheetProps) {
  const { t, language } = useI18n();

  const summary = useMemo(() => {
    const totalSets = entry.volumeData.reduce((sum, ex) => sum + ex.setsCompleted, 0);
    return buildWorkoutSummary(entry, history, totalSets, entry.durationSeconds ?? 0);
  }, [entry, history]);

  return (
    <Sheet onClose={onClose} title={t.history.detailTitle} height="82vh">
      <div className="h-full overflow-y-auto px-4 pb-6 no-scrollbar">
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl border-white/10 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                  {t.history.completed}
                </p>
                <h3 className="truncate font-display text-2xl font-black uppercase tracking-tighter text-white">
                  {entry.sessionTitle}
                </h3>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                {t.history.done}
              </span>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
              {formatCompletedAt(entry.completedAt, language)} · {formatDuration(entry.durationSeconds ?? 0)}
            </p>
          </div>

          {entry.notes && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                {language === 'en' ? 'Notes' : 'Notas'}
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-white/60">
                {entry.notes}
              </p>
            </div>
          )}

          <WorkoutSummaryBreakdown
            summary={summary}
            weightUnit={weightUnit}
          />
        </div>
      </div>
    </Sheet>
  );
}
