'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { StepFooter } from './StepFooter';
import { BodyFatGuide } from './BodyFatGuide';
import type { OnboardingDraft } from './types';
import type {
  Budget,
  DietaryRestriction,
  TrainingTime,
  TrainingType,
} from '@/types/nutrition';

interface OptionalStepProps {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function OptionalStep({ draft, onChange, onBack, onNext, onSkip }: OptionalStepProps) {
  const { t } = useI18n();
  const o = t.onboarding.optional;
  const [showGuide, setShowGuide] = useState(false);

  const trainingTypes: { id: TrainingType; label: string }[] = [
    { id: 'strength', label: o.trainingTypeStrength },
    { id: 'hypertrophy', label: o.trainingTypeHypertrophy },
    { id: 'cardio', label: o.trainingTypeCardio },
    { id: 'mixed', label: o.trainingTypeMixed },
  ];

  const trainingTimes: { id: TrainingTime; label: string }[] = [
    { id: 'morning', label: o.trainingTimeMorning },
    { id: 'afternoon', label: o.trainingTimeAfternoon },
    { id: 'evening', label: o.trainingTimeEvening },
  ];

  const restrictions: { id: DietaryRestriction; label: string }[] = [
    { id: 'vegan', label: o.restrictionVegan },
    { id: 'vegetarian', label: o.restrictionVegetarian },
    { id: 'pescatarian', label: o.restrictionPescatarian },
    { id: 'gluten_free', label: o.restrictionGlutenFree },
    { id: 'lactose_free', label: o.restrictionLactoseFree },
    { id: 'nut_free', label: o.restrictionNutFree },
    { id: 'halal', label: o.restrictionHalal },
    { id: 'kosher', label: o.restrictionKosher },
    { id: 'low_fodmap', label: o.restrictionLowFodmap },
  ];

  const budgets: { id: Budget; label: string }[] = [
    { id: 'low', label: o.budgetLow },
    { id: 'medium', label: o.budgetMedium },
    { id: 'high', label: o.budgetHigh },
  ];

  const toggleRestriction = (id: DietaryRestriction) => {
    const set = new Set(draft.dietaryRestrictions);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ dietaryRestrictions: Array.from(set) });
  };

  return (
    <>
    {showGuide && (
      <BodyFatGuide
        sex={draft.sex}
        onSelect={(pct) => onChange({ bodyFatPct: pct })}
        onClose={() => setShowGuide(false)}
      />
    )}
    <section className="flex flex-col gap-6 pt-2">
      <header>
        <h1 className="text-2xl font-black text-white">{o.title}</h1>
        <p className="text-sm text-white/50 mt-1">{o.subtitle}</p>
      </header>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-white/60">{o.bodyFat}</label>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-[rgb(var(--accent-primary-rgb))] hover:opacity-80 transition-opacity"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {o.bodyFatHelp}
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min={3}
            max={50}
            value={draft.bodyFatPct ?? ''}
            placeholder={o.bodyFatPlaceholder}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') return onChange({ bodyFatPct: null });
              const num = Number(raw);
              if (!Number.isFinite(num)) return;
              onChange({ bodyFatPct: num });
            }}
            className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 pr-10 text-white text-base font-semibold focus:outline-none focus:border-[rgb(var(--accent-primary-rgb))] transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">%</span>
        </div>
      </div>

      <Field label={`${o.trainingDays}: ${draft.trainingDaysPerWeek ?? 0}`}>
        <input
          type="range"
          min={0}
          max={7}
          step={1}
          value={draft.trainingDaysPerWeek ?? 0}
          onChange={(e) => onChange({ trainingDaysPerWeek: Number(e.target.value) })}
          className="w-full accent-[rgb(var(--accent-primary-rgb))]"
        />
      </Field>

      <Field label={o.trainingType}>
        <ChipRow>
          {trainingTypes.map((tt) => (
            <Chip
              key={tt.id}
              selected={draft.trainingType === tt.id}
              onClick={() =>
                onChange({ trainingType: draft.trainingType === tt.id ? null : tt.id })
              }
            >
              {tt.label}
            </Chip>
          ))}
        </ChipRow>
      </Field>

      <Field label={o.trainingTime}>
        <ChipRow>
          {trainingTimes.map((tm) => (
            <Chip
              key={tm.id}
              selected={draft.trainingTime === tm.id}
              onClick={() =>
                onChange({ trainingTime: draft.trainingTime === tm.id ? null : tm.id })
              }
            >
              {tm.label}
            </Chip>
          ))}
        </ChipRow>
      </Field>

      <Field label={o.restrictions}>
        <ChipRow>
          {restrictions.map((r) => (
            <Chip
              key={r.id}
              selected={draft.dietaryRestrictions.includes(r.id)}
              onClick={() => toggleRestriction(r.id)}
            >
              {r.label}
            </Chip>
          ))}
        </ChipRow>
      </Field>

      <Field label={o.customRestrictions}>
        <input
          type="text"
          value={draft.customRestrictions[0] ?? ''}
          placeholder={o.customRestrictionsPlaceholder}
          onChange={(e) =>
            onChange({ customRestrictions: e.target.value ? [e.target.value] : [] })
          }
          className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 text-white text-sm focus:outline-none focus:border-[rgb(var(--accent-primary-rgb))] transition-colors"
        />
      </Field>

      <Field label={o.budget}>
        <ChipRow>
          {budgets.map((b) => (
            <Chip
              key={b.id}
              selected={draft.budget === b.id}
              onClick={() => onChange({ budget: draft.budget === b.id ? null : b.id })}
            >
              {b.label}
            </Chip>
          ))}
        </ChipRow>
      </Field>

      <StepFooter
        onBack={onBack}
        onNext={onNext}
        onSkip={onSkip}
        backLabel={t.onboarding.back}
        nextLabel={t.onboarding.next}
        skipLabel={t.onboarding.skip}
      />
    </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">{label}</label>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'px-3 h-9 rounded-full text-xs font-bold transition-colors border',
        selected
          ? 'bg-[rgb(var(--accent-primary-rgb))]/20 border-[rgb(var(--accent-primary-rgb))] text-white'
          : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
