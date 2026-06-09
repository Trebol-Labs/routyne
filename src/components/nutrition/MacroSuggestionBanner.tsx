'use client';

import { useState } from 'react';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n/LanguageProvider';
import type { NutritionPhase } from '@/types/workout';
import type { WeeklyTrendAnalysis } from '@/lib/nutrition/weeklyAdjustment';
import { cn } from '@/lib/utils';

interface MacroSuggestionBannerProps {
  suggestion: WeeklyTrendAnalysis;
  phase: NutritionPhase;
  currentCalories: number;
  onApply: () => Promise<void>;
  onDismiss: () => Promise<void>;
}

export function MacroSuggestionBanner({
  suggestion,
  phase,
  currentCalories,
  onApply,
  onDismiss,
}: MacroSuggestionBannerProps) {
  const { t } = useI18n();
  const m = t.nutritionView.macroSuggestion;
  const phaseLabel = phase === 'volume' ? t.nutritionView.phaseBadge.volume : t.nutritionView.phaseBadge.definition;
  const [busy, setBusy] = useState(false);

  const copy =
    suggestion.status === 'too_fast'
      ? m.tooFastBody
      : m.stalledBody;

  const isIncrease = suggestion.deltaKcal > 0;
  const Icon = isIncrease ? TrendingUp : TrendingDown;

  const handle = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      role="status"
      className={cn(
        'rounded-3xl border border-amber-400/20 bg-amber-500/5 p-4 flex flex-col gap-3',
        suggestion.status === 'too_fast' && 'border-orange-400/20 bg-orange-500/5',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-amber-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            {m.title}
          </p>
          <p className="text-sm text-white/80 mt-1 leading-snug">
            {copy
              .replace('{weeks}', String(suggestion.weeksTracked))
              .replace('{phase}', phaseLabel)}
          </p>
          <p className="text-xs text-white/50 mt-2 tabular-nums">
            {m.from} <span className="text-white/70 font-bold">{currentCalories}</span>
            {' → '}
            <span className="text-white font-bold">{suggestion.suggestedCalories}</span>{' '}
            <span className="text-white/40">{m.kcal}</span>
            <span className={isIncrease ? 'text-emerald-300 ml-2' : 'text-rose-300 ml-2'}>
              {suggestion.deltaKcal > 0 ? '+' : ''}
              {suggestion.deltaKcal}
            </span>
          </p>
        </div>
        <button
          type="button"
          aria-label={m.dismiss}
          onClick={() => handle(onDismiss)}
          className="text-white/40 hover:text-white/80 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="glass-primary"
          size="sm"
          disabled={busy}
          onClick={() => handle(onApply)}
          className="flex-1"
        >
          {m.apply}
        </Button>
        <Button
          variant="glass"
          size="sm"
          disabled={busy}
          onClick={() => handle(onDismiss)}
          className="flex-1"
        >
          {m.dismiss}
        </Button>
      </div>
    </section>
  );
}
