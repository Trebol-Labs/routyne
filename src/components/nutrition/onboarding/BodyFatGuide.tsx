'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import type { BiologicalSex } from '@/types/nutrition';

interface BFRange {
  label: string;
  range: string;
  midpoint: number;
  desc: string;
  color: string;
  bar: string;
}

interface BodyFatGuideProps {
  sex: BiologicalSex | null;
  onSelect: (pct: number) => void;
  onClose: () => void;
}

export function BodyFatGuide({ sex, onSelect, onClose }: BodyFatGuideProps) {
  const { t } = useI18n();
  const o = t.onboarding.optional;

  const [activeSex, setActiveSex] = useState<BiologicalSex>(sex ?? 'male');

  const menRanges: BFRange[] = [
    {
      label: o.bodyFatGuideEssential,
      range: '2–5%',
      midpoint: 4,
      desc: o.bodyFatGuideEssentialMenDesc,
      color: 'border-sky-400/60 bg-sky-400/10',
      bar: 'bg-sky-400',
    },
    {
      label: o.bodyFatGuideAthletes,
      range: '6–13%',
      midpoint: 10,
      desc: o.bodyFatGuideAthletesMenDesc,
      color: 'border-emerald-400/60 bg-emerald-400/10',
      bar: 'bg-emerald-400',
    },
    {
      label: o.bodyFatGuideFitness,
      range: '14–17%',
      midpoint: 16,
      desc: o.bodyFatGuideFitnessMenDesc,
      color: 'border-lime-400/60 bg-lime-400/10',
      bar: 'bg-lime-400',
    },
    {
      label: o.bodyFatGuideAverage,
      range: '18–24%',
      midpoint: 21,
      desc: o.bodyFatGuideAverageMenDesc,
      color: 'border-amber-400/60 bg-amber-400/10',
      bar: 'bg-amber-400',
    },
    {
      label: o.bodyFatGuideHigh,
      range: '25%+',
      midpoint: 28,
      desc: o.bodyFatGuideHighMenDesc,
      color: 'border-rose-400/60 bg-rose-400/10',
      bar: 'bg-rose-400',
    },
  ];

  const womenRanges: BFRange[] = [
    {
      label: o.bodyFatGuideEssential,
      range: '10–13%',
      midpoint: 12,
      desc: o.bodyFatGuideEssentialWomenDesc,
      color: 'border-sky-400/60 bg-sky-400/10',
      bar: 'bg-sky-400',
    },
    {
      label: o.bodyFatGuideAthletes,
      range: '14–20%',
      midpoint: 17,
      desc: o.bodyFatGuideAthletesWomenDesc,
      color: 'border-emerald-400/60 bg-emerald-400/10',
      bar: 'bg-emerald-400',
    },
    {
      label: o.bodyFatGuideFitness,
      range: '21–24%',
      midpoint: 23,
      desc: o.bodyFatGuideFitnessWomenDesc,
      color: 'border-lime-400/60 bg-lime-400/10',
      bar: 'bg-lime-400',
    },
    {
      label: o.bodyFatGuideAverage,
      range: '25–31%',
      midpoint: 28,
      desc: o.bodyFatGuideAverageWomenDesc,
      color: 'border-amber-400/60 bg-amber-400/10',
      bar: 'bg-amber-400',
    },
    {
      label: o.bodyFatGuideHigh,
      range: '32%+',
      midpoint: 35,
      desc: o.bodyFatGuideHighWomenDesc,
      color: 'border-rose-400/60 bg-rose-400/10',
      bar: 'bg-rose-400',
    },
  ];

  const ranges = activeSex === 'male' ? menRanges : womenRanges;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1117] p-6 flex flex-col gap-5 max-h-[85dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">{o.bodyFatGuideTitle}</h2>
            <p className="text-xs text-white/50 mt-0.5">{o.bodyFatGuideSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sex toggle */}
        <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
          {(['male', 'female'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveSex(s)}
              className={[
                'flex-1 h-9 rounded-xl text-xs font-bold transition-colors',
                activeSex === s
                  ? 'bg-[rgb(var(--accent-primary-rgb))]/20 text-white border border-[rgb(var(--accent-primary-rgb))]/60'
                  : 'text-white/50 hover:text-white',
              ].join(' ')}
            >
              {s === 'male' ? o.bodyFatGuideMen : o.bodyFatGuideWomen}
            </button>
          ))}
        </div>

        {/* Ranges */}
        <div className="flex flex-col gap-2">
          {ranges.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => {
                onSelect(r.midpoint);
                onClose();
              }}
              className={[
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98]',
                r.color,
              ].join(' ')}
            >
              {/* Color bar */}
              <div className={`w-1 self-stretch rounded-full ${r.bar}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-white">{r.range}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{r.label}</span>
                </div>
                <p className="text-[11px] text-white/60 mt-0.5 leading-snug">{r.desc}</p>
              </div>

              <span className="shrink-0 text-[10px] font-bold text-white/30">→</span>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-white/30 text-center">{o.bodyFatGuideSelectHint}</p>
      </div>
    </div>
  );
}
