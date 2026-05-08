'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import { StepFooter } from './StepFooter';
import type { TrainingSplit } from '@/types/fitness';

export interface FitnessDraft {
  trainingSplit: TrainingSplit | null;
  isPowerlifter: boolean;
  hasHevyBackground: boolean;
  mainLiftsSummary: string;
}

export const EMPTY_FITNESS_DRAFT: FitnessDraft = {
  trainingSplit: null,
  isPowerlifter: false,
  hasHevyBackground: false,
  mainLiftsSummary: '',
};

interface FitnessStepProps {
  draft: FitnessDraft;
  onChange: (patch: Partial<FitnessDraft>) => void;
  onBack: () => void;
  onFinish: () => void;
  onSkip: () => void;
  isSaving: boolean;
}

export function FitnessStep({ draft, onChange, onBack, onFinish, onSkip, isSaving }: FitnessStepProps) {
  const { t } = useI18n();
  const f = t.onboarding.fitness;

  const splits: { id: TrainingSplit; label: string; desc: string }[] = [
    { id: 'ppl', label: f.splitPPL, desc: f.splitPPLDesc },
    { id: 'upper_lower', label: f.splitUpperLower, desc: f.splitUpperLowerDesc },
    { id: 'full_body', label: f.splitFullBody, desc: f.splitFullBodyDesc },
    { id: 'push_pull', label: f.splitPushPull, desc: f.splitPushPullDesc },
    { id: 'no_preference', label: f.splitNoPreference, desc: f.splitNoPreferenceDesc },
  ];

  return (
    <section className="flex flex-col gap-6 pt-2">
      <header>
        <h1 className="text-2xl font-black text-white">{f.title}</h1>
        <p className="text-sm text-white/50 mt-1">{f.subtitle}</p>
      </header>

      {/* Training split */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
          {f.splitLabel}
        </label>
        <div className="flex flex-col gap-2">
          {splits.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                onChange({ trainingSplit: draft.trainingSplit === s.id ? null : s.id })
              }
              aria-pressed={draft.trainingSplit === s.id}
              className={[
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.99]',
                draft.trainingSplit === s.id
                  ? 'border-[rgb(var(--accent-primary-rgb))] bg-[rgb(var(--accent-primary-rgb))]/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
              ].join(' ')}
            >
              <div
                className={[
                  'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                  draft.trainingSplit === s.id
                    ? 'border-[rgb(var(--accent-primary-rgb))] bg-[rgb(var(--accent-primary-rgb))]'
                    : 'border-white/30',
                ].join(' ')}
              >
                {draft.trainingSplit === s.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{s.label}</p>
                <p className="text-[11px] text-white/50 mt-0.5">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Powerlifting background */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
          {f.powerliftingLabel}
        </label>
        <div className="flex flex-col gap-2">
          {[
            { value: true, label: f.powerliftingYes },
            { value: false, label: f.powerliftingNo },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange({ isPowerlifter: opt.value })}
              aria-pressed={draft.isPowerlifter === opt.value}
              className={[
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                draft.isPowerlifter === opt.value
                  ? 'border-[rgb(var(--accent-primary-rgb))] bg-[rgb(var(--accent-primary-rgb))]/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
              ].join(' ')}
            >
              <div
                className={[
                  'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                  draft.isPowerlifter === opt.value
                    ? 'border-[rgb(var(--accent-primary-rgb))] bg-[rgb(var(--accent-primary-rgb))]'
                    : 'border-white/30',
                ].join(' ')}
              >
                {draft.isPowerlifter === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <p className="text-sm font-semibold text-white/90">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main lifts — only if powerlifter */}
      {draft.isPowerlifter && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
            {f.mainLiftsLabel}
          </label>
          <textarea
            value={draft.mainLiftsSummary}
            placeholder={f.mainLiftsPlaceholder}
            onChange={(e) => onChange({ mainLiftsSummary: e.target.value })}
            rows={2}
            className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[rgb(var(--accent-primary-rgb))] transition-colors resize-none"
          />
          <p className="text-[10px] text-white/30 mt-1">{f.mainLiftsHint}</p>
        </div>
      )}

      {/* Hevy background */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
          {f.hevyLabel}
        </label>
        <div className="flex gap-2">
          {[
            { value: true, label: f.hevyYes },
            { value: false, label: f.hevyNo },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange({ hasHevyBackground: opt.value })}
              aria-pressed={draft.hasHevyBackground === opt.value}
              className={[
                'flex-1 h-10 rounded-2xl border text-sm font-bold transition-colors',
                draft.hasHevyBackground === opt.value
                  ? 'border-[rgb(var(--accent-primary-rgb))] bg-[rgb(var(--accent-primary-rgb))]/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <StepFooter
        onBack={onBack}
        onNext={onFinish}
        onSkip={onSkip}
        backLabel={t.onboarding.back}
        nextLabel={isSaving ? '…' : t.onboarding.finish}
        nextDisabled={isSaving}
        skipLabel={t.onboarding.skip}
      />
    </section>
  );
}
