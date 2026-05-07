'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import { SelectCard } from './SelectCard';
import { StepFooter } from './StepFooter';
import { isBasicsValid, type OnboardingDraft } from './types';

interface BasicsStepProps {
  draft: OnboardingDraft;
  weightUnit: 'kg' | 'lbs';
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onBack: () => void;
  onNext: () => void;
}

const KG_PER_LB = 0.45359237;

export function BasicsStep({ draft, weightUnit, onChange, onBack, onNext }: BasicsStepProps) {
  const { t } = useI18n();
  const b = t.onboarding.basics;

  const ageError = draft.ageYears !== null && (draft.ageYears < 14 || draft.ageYears > 90) ? b.errorAge : null;
  const heightError = draft.heightCm !== null && (draft.heightCm <= 50 || draft.heightCm >= 250) ? b.errorHeight : null;
  const weightError = draft.weightKg !== null && (draft.weightKg <= 25 || draft.weightKg >= 300) ? b.errorWeight : null;

  const weightDisplay =
    draft.weightKg === null
      ? ''
      : weightUnit === 'lbs'
      ? Math.round(draft.weightKg / KG_PER_LB).toString()
      : Math.round(draft.weightKg).toString();

  return (
    <section className="flex flex-col gap-6 pt-2">
      <header>
        <h1 className="text-2xl font-black text-white">{b.title}</h1>
        <p className="text-sm text-white/50 mt-1">{b.subtitle}</p>
      </header>

      <Field label={b.sex} hint={b.sexHint}>
        <div className="grid grid-cols-2 gap-2">
          <SelectCard
            selected={draft.sex === 'male'}
            onClick={() => onChange({ sex: 'male' })}
            title={b.sexMale}
            compact
          />
          <SelectCard
            selected={draft.sex === 'female'}
            onClick={() => onChange({ sex: 'female' })}
            title={b.sexFemale}
            compact
          />
        </div>
      </Field>

      <Field label={b.age} error={ageError}>
        <NumberInput
          value={draft.ageYears}
          onChange={(v) => onChange({ ageYears: v })}
          placeholder={b.agePlaceholder}
          suffix=""
          min={14}
          max={90}
        />
      </Field>

      <Field label={b.height} error={heightError}>
        <NumberInput
          value={draft.heightCm}
          onChange={(v) => onChange({ heightCm: v })}
          placeholder="170"
          suffix={b.heightCm}
          min={50}
          max={250}
        />
      </Field>

      <Field label={b.weight} error={weightError}>
        <NumberInput
          value={weightDisplay === '' ? null : Number(weightDisplay)}
          onChange={(v) => {
            if (v === null) {
              onChange({ weightKg: null });
              return;
            }
            const kg = weightUnit === 'lbs' ? v * KG_PER_LB : v;
            onChange({ weightKg: kg });
          }}
          placeholder={weightUnit === 'lbs' ? '170' : '75'}
          suffix={weightUnit === 'lbs' ? b.weightLbs : b.weightKg}
          min={25}
          max={weightUnit === 'lbs' ? 660 : 300}
        />
      </Field>

      <StepFooter
        onBack={onBack}
        onNext={onNext}
        backLabel={t.onboarding.back}
        nextLabel={t.onboarding.next}
        nextDisabled={!isBasicsValid(draft) || !!ageError || !!heightError || !!weightError}
      />
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">{label}</label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-[11px] text-white/40">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-[11px] text-rose-400">{error}</p> : null}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  suffix,
  min,
  max,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
  suffix: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(null);
            return;
          }
          const num = Number(raw);
          if (!Number.isFinite(num)) return;
          onChange(num);
        }}
        className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 pr-14 text-white text-base font-semibold focus:outline-none focus:border-[rgb(var(--accent-primary-rgb))] focus:bg-white/[0.06] transition-colors"
      />
      {suffix ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40 uppercase">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
