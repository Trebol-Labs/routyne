'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Apple, Flame, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { StepFooter } from '@/components/nutrition/onboarding/StepFooter';
import { Button } from '@/components/ui/button';
import { kcalFromMacros } from '@/lib/nutrition/calculations';
import { cn } from '@/lib/utils';
import type { NutritionPhase } from '@/types/workout';

export interface NutritionMacroGoal {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  phase: NutritionPhase;
}

interface NutritionSetupFlowProps {
  onComplete: (goal: NutritionMacroGoal) => Promise<void> | void;
}

type SetupStep = 'intro' | 'phase' | 'macros' | 'summary';

type MacroDraft = {
  proteinG: string;
  carbsG: string;
  fatG: string;
};

type MacroSegment = {
  key: 'protein' | 'fat' | 'carbs';
  grams: number;
  kcal: number;
  className: string;
};

const STEP_ORDER: SetupStep[] = ['intro', 'phase', 'macros', 'summary'];
const STEP_EASE = [0.23, 1, 0.32, 1] as const;

function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatMacroLabel(proteinG: number, fatsG: number, carbsG: number): string {
  return `${Math.round(proteinG)} P / ${Math.round(fatsG)} F / ${Math.round(carbsG)} C`;
}

function buildSegments(proteinG: number, carbsG: number, fatG: number): MacroSegment[] {
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsKcal = carbsG * 4;

  return [
    { key: 'protein', grams: proteinG, kcal: proteinKcal, className: 'bg-blue-300' },
    { key: 'fat', grams: fatG, kcal: fatKcal, className: 'bg-rose-300' },
    { key: 'carbs', grams: carbsG, kcal: carbsKcal, className: 'bg-amber-300' },
  ];
}

export function NutritionSetupFlow({ onComplete }: NutritionSetupFlowProps) {
  const { t } = useI18n();
  const s = t.nutritionView.setup;
  const [step, setStep] = useState<SetupStep>('intro');
  const [draft, setDraft] = useState<MacroDraft>({
    proteinG: '',
    carbsG: '',
    fatG: '',
  });
  const [phase, setPhase] = useState<NutritionPhase | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const proteinG = toNumber(draft.proteinG);
  const carbsG = toNumber(draft.carbsG);
  const fatG = toNumber(draft.fatG);
  const calories = kcalFromMacros(proteinG, carbsG, fatG);
  const hasMacros = calories > 0;
  const progressPct = ((STEP_ORDER.indexOf(step) + 1) / STEP_ORDER.length) * 100;
  const segments = buildSegments(proteinG, carbsG, fatG);

  const completeSetup = async () => {
    if (!hasMacros || isSaving) return;

    setIsSaving(true);
    try {
      await onComplete({
        calories,
        proteinGrams: proteinG,
        carbsGrams: carbsG,
        fatGrams: fatG,
        phase: phase ?? 'volume',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-6 pt-2">
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-[rgb(var(--accent-primary-rgb))] to-[rgb(var(--accent-secondary-rgb))]"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.45, ease: STEP_EASE }}
        />
      </div>

      <AnimatePresence mode="wait">
        {step === 'intro' ? (
          <motion.section
            key="intro"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: STEP_EASE }}
            className="glass-panel rounded-[2rem] border-white/10 p-6 sm:p-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
          >
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-white/10 bg-gradient-to-tr from-white/20 to-white/5 p-px backdrop-blur-3xl">
                  <div className="flex h-full w-full items-center justify-center rounded-[1.4rem] border border-white/10 bg-black/40">
                    <Apple className="h-9 w-9 text-emerald-300" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/35">
                  {t.navigation.nutrition}
                </p>
                <h1 className="text-3xl font-black tracking-tighter text-white sm:text-4xl">
                  {s.intro.title}
                </h1>
                <p className="text-sm leading-relaxed text-white/60">
                  {s.intro.body}
                </p>
              </div>

              <Button variant="glass-primary" size="xl" onClick={() => setStep('phase')} className="w-full sm:w-auto sm:min-w-56">
                {s.intro.cta}
              </Button>
            </div>
          </motion.section>
        ) : step === 'phase' ? (
          <motion.section
            key="phase"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: STEP_EASE }}
            className="space-y-4"
          >
            <div className="glass-panel rounded-[2rem] border-white/10 p-5 sm:p-6 space-y-5">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/35">
                  {t.navigation.nutrition}
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-white sm:text-3xl">
                  {s.phase.title}
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-white/55">
                  {s.phase.subtitle}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPhase('volume')}
                  aria-pressed={phase === 'volume'}
                  className={cn(
                    'rounded-[1.6rem] border p-4 text-left transition-all',
                    phase === 'volume'
                      ? 'border-emerald-300/30 bg-emerald-400/10 text-white shadow-[0_0_0_1px_rgba(110,231,183,0.3)]'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors',
                      phase === 'volume'
                        ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                        : 'border-white/10 bg-white/[0.04] text-white/55',
                    )}>
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-black tracking-tight">{s.phase.volume.label}</p>
                      <p className="text-sm leading-relaxed text-white/55">
                        {s.phase.volume.caption}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPhase('definition')}
                  aria-pressed={phase === 'definition'}
                  className={cn(
                    'rounded-[1.6rem] border p-4 text-left transition-all',
                    phase === 'definition'
                      ? 'border-sky-300/30 bg-sky-400/10 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.3)]'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors',
                      phase === 'definition'
                        ? 'border-sky-300/30 bg-sky-400/10 text-sky-100'
                        : 'border-white/10 bg-white/[0.04] text-white/55',
                    )}>
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-black tracking-tight">{s.phase.definition.label}</p>
                      <p className="text-sm leading-relaxed text-white/55">
                        {s.phase.definition.caption}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <StepFooter
              onBack={() => setStep('intro')}
              onNext={() => setStep('macros')}
              backLabel={s.phase.back}
              nextLabel={s.phase.continue}
              nextDisabled={!phase}
            />
          </motion.section>
        ) : step === 'macros' ? (
          <motion.section
            key="macros"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: STEP_EASE }}
            className="space-y-4"
          >
            <div className="glass-panel rounded-[2rem] border-white/10 p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/35">
                    {t.navigation.nutrition}
                  </p>
                  <h2 className="text-2xl font-black tracking-tighter text-white sm:text-3xl">
                    {s.macros.title}
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/50">
                  <Flame className="h-5 w-5" />
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-white/10 bg-black/30 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">
                  {s.macros.kcal}
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-5xl font-black leading-none tracking-tighter text-white tabular-nums">
                    {Math.round(calories)}
                  </span>
                  <span className="pb-1 text-sm font-black uppercase tracking-[0.26em] text-white/35">
                    {s.macros.kcal}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MacroInput
                  label={s.macros.protein}
                  value={draft.proteinG}
                  onChange={(value) => setDraft((current) => ({ ...current, proteinG: value }))}
                  accent="blue"
                />
                <MacroInput
                  label={s.macros.carbs}
                  value={draft.carbsG}
                  onChange={(value) => setDraft((current) => ({ ...current, carbsG: value }))}
                  accent="amber"
                />
                <MacroInput
                  label={s.macros.fat}
                  value={draft.fatG}
                  onChange={(value) => setDraft((current) => ({ ...current, fatG: value }))}
                  accent="rose"
                />
              </div>
            </div>

            <StepFooter
              onBack={() => setStep('phase')}
              onNext={() => setStep('summary')}
              backLabel={s.macros.back}
              nextLabel={s.macros.continue}
              nextDisabled={!hasMacros}
            />
          </motion.section>
        ) : (
          <motion.section
            key="summary"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: STEP_EASE }}
            className="space-y-4"
          >
            <div className="glass-panel rounded-[2rem] border-white/10 p-5 sm:p-6 space-y-5">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/35">
                  {t.navigation.nutrition}
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-white sm:text-3xl">
                  {s.summary.title}
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-white/55">
                  {s.summary.subtitle}
                </p>
                {phase && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                      phase === 'volume'
                        ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
                        : 'border-sky-300/20 bg-sky-400/10 text-sky-100',
                    )}
                  >
                    {phase === 'volume' ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {phase === 'volume' ? s.phase.volume.label : s.phase.definition.label}
                  </div>
                )}
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-black/30 p-4 sm:p-5">
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {STEP_DAYS.map((dayKey) => (
                    <WeekColumn
                      key={dayKey}
                      dayLabel={s.days[dayKey]}
                      calories={calories}
                      segments={segments}
                      kcalLabel={s.macros.kcal}
                    />
                  ))}
                </div>
              </div>
            </div>

            <StepFooter
              onBack={() => setStep('macros')}
              onNext={() => completeSetup().catch(console.error)}
              backLabel={s.summary.back}
              nextLabel={isSaving ? '…' : s.summary.done}
              nextDisabled={!hasMacros || isSaving}
            />
          </motion.section>
        )}
      </AnimatePresence>
    </section>
  );
}

function MacroInput({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accent: 'blue' | 'amber' | 'rose';
}) {
  const focusClasses = {
    blue: 'focus:border-blue-300/50 focus:ring-blue-300/20',
    amber: 'focus:border-amber-300/50 focus:ring-amber-300/20',
    rose: 'focus:border-rose-300/50 focus:ring-rose-300/20',
  };

  return (
    <label className="space-y-1.5">
      <span className="text-[9px] font-black uppercase tracking-[0.28em] text-white/35">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold text-white outline-none transition-colors placeholder:text-white/20',
          'focus:ring-2',
          focusClasses[accent],
        )}
      />
    </label>
  );
}

function WeekColumn({
  dayLabel,
  calories,
  segments,
  kcalLabel,
}: {
  dayLabel: string;
  calories: number;
  segments: MacroSegment[];
  kcalLabel: string;
}) {
  const totalSegmentKcal = segments.reduce((sum, segment) => sum + segment.kcal, 0);
  const macroLabel = formatMacroLabel(
    segments.find((segment) => segment.key === 'protein')?.grams ?? 0,
    segments.find((segment) => segment.key === 'fat')?.grams ?? 0,
    segments.find((segment) => segment.key === 'carbs')?.grams ?? 0,
  );

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">
        {dayLabel}
      </span>
      <div className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/80 tabular-nums">
        {Math.round(calories)} {kcalLabel}
      </div>
      <div className="flex h-32 w-full max-w-[3rem] flex-col-reverse overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.04]">
        {segments.map((segment) => {
          const heightPct = totalSegmentKcal > 0 ? (segment.kcal / totalSegmentKcal) * 100 : 0;
          return (
            <div
              key={segment.key}
              className={cn('w-full border-t border-black/10', segment.className)}
              style={{ height: `${heightPct}%` }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <p className="max-w-[4.25rem] text-[7px] font-black uppercase leading-[1.05] tracking-[0.08em] text-white/40">
        {macroLabel}
      </p>
    </div>
  );
}

const STEP_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
