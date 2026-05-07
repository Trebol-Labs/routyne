'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { buildMealPlan } from '@/lib/nutrition/calculations';
import type { NutritionProfile } from '@/types/nutrition';

interface NutritionPlanCardProps {
  profile: NutritionProfile;
  consumedKcal: number;
}

export function NutritionPlanCard({ profile, consumedKcal }: NutritionPlanCardProps) {
  const { t } = useI18n();
  const s = t.onboarding.summary;

  const remaining = Math.max(0, profile.targetKcal - consumedKcal);
  const ringPct = Math.min(100, (consumedKcal / profile.targetKcal) * 100);

  // Recompute the plan locally so the card stays in sync if the user changes
  // training time later — derives, doesn't persist.
  const mealPlan = buildMealPlan({
    weightKg: profile.weightKg,
    macros: {
      proteinG: profile.proteinG,
      fatsG: profile.fatsG,
      carbsG: profile.carbsG,
      proteinKcal: profile.proteinG * 4,
      fatsKcal: profile.fatsG * 9,
      carbsKcal: profile.carbsG * 4,
    },
    trainingTime: profile.trainingTime,
  });

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[rgb(var(--accent-primary-rgb))]" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            {s.title}
          </h2>
        </div>
      </header>

      <div className="flex items-end gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
            <motion.circle
              cx="50" cy="50" r="42"
              stroke="rgb(var(--accent-primary-rgb))"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              initial={false}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - ringPct / 100) }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{s.target}</span>
            <span className="text-lg font-black text-white tabular-nums leading-none mt-0.5">{remaining}</span>
            <span className="text-[9px] text-white/40 mt-0.5">{s.kcalPerDay}</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          <MacroChip label={s.protein} grams={profile.proteinG} accent="bg-rose-400/80" />
          <MacroChip label={s.carbs} grams={profile.carbsG} accent="bg-amber-400/80" />
          <MacroChip label={s.fats} grams={profile.fatsG} accent="bg-emerald-400/80" />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">{s.meals}</p>
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {mealPlan.meals.map((meal, i) => (
            <div key={`${meal.slot}-${i}`} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-bold text-white">{meal.label}</span>
              <span className="text-[11px] text-white/50 font-mono tabular-nums">
                P{meal.proteinG} · C{meal.carbsG} · G{meal.fatsG}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MacroChip({ label, grams, accent }: { label: string; grams: number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1 h-1 rounded-full ${accent}`} />
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 truncate">{label}</span>
      </div>
      <p className="text-base font-black text-white tabular-nums leading-none">
        {grams}<span className="text-[10px] text-white/40 ml-0.5">g</span>
      </p>
    </div>
  );
}
