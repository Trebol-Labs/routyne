'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n/LanguageProvider';
import type { PendingAdjustment } from '@/lib/db/nutritionAdjustment';

interface AdjustmentBannerProps {
  pending: PendingAdjustment;
  onApply: () => Promise<void>;
  onReject: () => Promise<void>;
}

export function AdjustmentBanner({ pending, onApply, onReject }: AdjustmentBannerProps) {
  const { t } = useI18n();
  const a = t.nutritionView.adjustment;
  const [busy, setBusy] = useState(false);

  const reasonText =
    pending.reason === 'too_fast'
      ? a.tooFast
      : pending.reason === 'too_slow'
      ? a.tooSlow
      : a.onTrack;

  const isIncrease = pending.deltaKcal > 0;

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
      className="rounded-3xl border border-amber-400/20 bg-amber-500/5 p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
          {isIncrease ? (
            <TrendingUp className="w-4 h-4 text-amber-200" />
          ) : (
            <TrendingDown className="w-4 h-4 text-amber-200" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{a.title}</p>
          <p className="text-sm text-white/80 mt-1 leading-snug">
            {reasonText.replace('{pct}', pending.weeklyWeightChangePct.toFixed(1))}
          </p>
          <p className="text-xs text-white/50 mt-2 tabular-nums">
            {a.from} <span className="text-white/70 font-bold">{pending.previousTargetKcal}</span>
            {' → '}
            <span className="text-white font-bold">{pending.suggestedTargetKcal}</span>{' '}
            <span className="text-white/40">{a.kcal}</span>
            <span className={isIncrease ? 'text-emerald-300 ml-2' : 'text-rose-300 ml-2'}>
              {isIncrease ? '+' : ''}
              {pending.deltaKcal}
            </span>
          </p>
        </div>
        <button
          type="button"
          aria-label={a.reject}
          onClick={() => handle(onReject)}
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
          {a.apply}
        </Button>
        <Button
          variant="glass"
          size="sm"
          disabled={busy}
          onClick={() => handle(onReject)}
          className="flex-1"
        >
          {a.reject}
        </Button>
      </div>
    </section>
  );
}
