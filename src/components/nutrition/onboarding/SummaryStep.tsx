'use client';

import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { StepFooter } from './StepFooter';
import type { ComputeAllResult } from '@/lib/nutrition/calculations';

interface SummaryStepProps {
  result: ComputeAllResult;
  onBack: () => void;
  onFinish: () => void;
  isSaving: boolean;
}

export function SummaryStep({ result, onBack, onFinish, isSaving }: SummaryStepProps) {
  const { t } = useI18n();
  const s = t.onboarding.summary;
  const warningMap = s.warnings as unknown as Record<string, string>;

  return (
    <section className="flex flex-col gap-6 pt-2">
      <header>
        <h1 className="text-2xl font-black text-white">{s.title}</h1>
        <p className="text-sm text-white/50 mt-1">{s.subtitle}</p>
      </header>

      {/* Calorie summary card */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <span className="text-5xl font-black text-white tabular-nums">{result.targetKcal}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5">{s.kcalPerDay}</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-white/40">{s.target}</p>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <Stat label={s.bmr} value={`${result.bmrKcal}`} />
          <Stat label={s.tdee} value={`${result.tdeeKcal}`} />
        </div>
      </div>

      {/* Macros */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">{s.macros}</h2>
        <div className="grid grid-cols-3 gap-2">
          <MacroBlock label={s.protein} grams={result.macros.proteinG} kcal={result.macros.proteinKcal} accent="bg-rose-400/80" />
          <MacroBlock label={s.carbs} grams={result.macros.carbsG} kcal={result.macros.carbsKcal} accent="bg-amber-400/80" />
          <MacroBlock label={s.fats} grams={result.macros.fatsG} kcal={result.macros.fatsKcal} accent="bg-emerald-400/80" />
        </div>
      </div>

      {/* Meals */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
          {s.meals} ({result.mealPlan.meals.length})
        </h2>
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {result.mealPlan.meals.map((meal, i) => (
            <div key={`${meal.slot}-${i}`} className="flex items-center justify-between p-3">
              <span className="text-sm font-bold text-white">{meal.label}</span>
              <span className="text-[11px] text-white/50 font-mono tabular-nums">
                P{meal.proteinG} · C{meal.carbsG} · G{meal.fatsG}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 ? (
        <div className="flex flex-col gap-2">
          {result.warnings.map((key) => (
            <div
              key={key}
              className="flex items-start gap-2 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-100/90 leading-snug">
                {warningMap[key.replace(/^warning\./, '')] ?? key}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-[11px] text-white/40 leading-relaxed text-center px-4">{s.calibrationNote}</p>

      <StepFooter
        onBack={onBack}
        onNext={onFinish}
        backLabel={t.onboarding.back}
        nextLabel={isSaving ? '…' : t.onboarding.finish}
        nextDisabled={isSaving}
      />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-base font-bold text-white tabular-nums">{value} kcal</p>
    </div>
  );
}

function MacroBlock({
  label,
  grams,
  kcal,
  accent,
}: {
  label: string;
  grams: number;
  kcal: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${accent}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</span>
      </div>
      <p className="text-2xl font-black text-white tabular-nums">{grams}<span className="text-xs text-white/40 ml-0.5">g</span></p>
      <p className="text-[10px] text-white/40 mt-0.5">{kcal} kcal</p>
    </div>
  );
}
