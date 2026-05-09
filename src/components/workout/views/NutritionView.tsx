'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Apple,
  Activity,
  Beef,
  CalendarDays,
  Flame,
  Pencil,
  Plus,
  Save,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wheat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { cn } from '@/lib/utils';
import { buildNutritionPlanRecommendation, type NutritionPlanGoal } from '@/lib/nutrition/planner';
import { getLatestBodyweight } from '@/lib/db/bodyweight';
import type { MealType, NutritionEntry, NutritionTotals } from '@/types/workout';
import type { NutritionProfile } from '@/types/nutrition';
import { loadNutritionProfile } from '@/lib/db/nutritionProfile';
import { NUTRITION_ENABLED } from '@/lib/feature-flags';
import { NutritionPlanCard } from '@/components/nutrition/NutritionPlanCard';
import { NutritionEmptyState } from '@/components/nutrition/NutritionEmptyState';
import { AdjustmentBanner } from '@/components/nutrition/AdjustmentBanner';
import { useAdaptiveCheck } from '@/hooks/useAdaptiveCheck';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};

const EMPTY_TOTALS: NutritionTotals = {
  calories: 0,
  proteinGrams: 0,
  carbsGrams: 0,
  fatGrams: 0,
};

type EntryForm = {
  id?: string;
  mealType: MealType;
  foodName: string;
  servingLabel: string;
  calories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatGrams: string;
  notes: string;
};

type GoalForm = {
  calories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatGrams: string;
};

type PlannerForm = {
  goal: NutritionPlanGoal;
  currentWeight: string;
  targetWeight: string;
  weeks: string;
};

const GOAL_FIELDS: { key: keyof GoalForm; label: string }[] = [
  { key: 'calories', label: 'Kcal' },
  { key: 'proteinGrams', label: 'Proteína' },
  { key: 'carbsGrams', label: 'Carbos' },
  { key: 'fatGrams', label: 'Grasa' },
];

const PLAN_GOALS: {
  value: NutritionPlanGoal;
  label: string;
  caption: string;
  icon: LucideIcon;
}[] = [
  { value: 'cut', label: 'Perder grasa', caption: 'Déficit con proteína alta', icon: TrendingDown },
  { value: 'gain', label: 'Ganar músculo', caption: 'Superávit controlado', icon: TrendingUp },
  { value: 'recomp', label: 'Recomposición', caption: 'Mantenimiento o déficit leve', icon: Activity },
];

const ENTRY_MACRO_FIELDS: { key: keyof Pick<EntryForm, 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'>; label: string; icon: LucideIcon }[] = [
  { key: 'calories', label: 'Kcal', icon: Flame },
  { key: 'proteinGrams', label: 'Prot', icon: Beef },
  { key: 'carbsGrams', label: 'Carb', icon: Wheat },
  { key: 'fatGrams', label: 'Grasa', icon: Apple },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyForm(mealType: MealType = 'breakfast'): EntryForm {
  return {
    mealType,
    foodName: '',
    servingLabel: '',
    calories: '',
    proteinGrams: '',
    carbsGrams: '',
    fatGrams: '',
    notes: '',
  };
}

function createFormFromEntry(entry: NutritionEntry): EntryForm {
  return {
    id: entry.id,
    mealType: entry.mealType,
    foodName: entry.foodName,
    servingLabel: entry.servingLabel,
    calories: String(entry.calories),
    proteinGrams: String(entry.proteinGrams),
    carbsGrams: String(entry.carbsGrams),
    fatGrams: String(entry.fatGrams),
    notes: entry.notes ?? '',
  };
}

function createInitialPlannerForm(): PlannerForm {
  return {
    goal: 'recomp',
    currentWeight: '',
    targetWeight: '',
    weeks: '12',
  };
}

function ProgressBar({ value, total, className }: { value: number; total: number; className: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', className)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MacroCard({
  label,
  value,
  goal,
  unit,
  className,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  className: string;
}) {
  return (
    <div className="glass-panel rounded-[var(--radius-lg)] p-3 border-white/5 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className={cn('text-lg font-black tracking-tighter font-display truncate', className)}>
          {Math.round(value)}
          <span className="text-[10px] text-white/35 ml-0.5">{unit}</span>
        </p>
        <p className="text-[9px] text-white/30 font-black">/{Math.round(goal)}</p>
      </div>
      <ProgressBar value={value} total={goal} className={className.replace('text-', 'bg-')} />
      <p className="text-[9px] uppercase tracking-[0.24em] font-black text-white/35">{label}</p>
    </div>
  );
}

export function NutritionView() {
  const {
    profile,
    nutritionEntries,
    nutritionGoal,
    loadNutritionDay,
    saveNutritionEntry,
    deleteNutritionEntry,
    updateNutritionGoal,
  } = useWorkoutStore();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [entryForm, setEntryForm] = useState<EntryForm>(() => createEmptyForm());
  const [goalForm, setGoalForm] = useState<GoalForm>({
    calories: String(nutritionGoal.calories),
    proteinGrams: String(nutritionGoal.proteinGrams),
    carbsGrams: String(nutritionGoal.carbsGrams),
    fatGrams: String(nutritionGoal.fatGrams),
  });
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [coachProfile, setCoachProfile] = useState<NutritionProfile | null>(null);
  const [coachLoaded, setCoachLoaded] = useState(() => !NUTRITION_ENABLED);
  const adaptive = useAdaptiveCheck();
  const [plannerForm, setPlannerForm] = useState<PlannerForm>(() => createInitialPlannerForm());

  useEffect(() => {
    loadNutritionDay(selectedDate).catch(console.error);
  }, [loadNutritionDay, selectedDate]);

  useEffect(() => {
    if (!NUTRITION_ENABLED) return;
    let cancelled = false;
    loadNutritionProfile()
      .then((p) => {
        if (!cancelled) {
          setCoachProfile(p);
          setCoachLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setCoachLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    getLatestBodyweight()
      .then((entry) => {
        if (!entry) return;
        setPlannerForm((form) => {
          if (form.currentWeight.trim()) return form;
          const weight = String(entry.weight);
          return {
            ...form,
            currentWeight: weight,
            targetWeight: form.goal === 'recomp' ? weight : form.targetWeight,
          };
        });
      })
      .catch(console.error);
  }, []);

  const totals = useMemo(
    () => nutritionEntries.reduce<NutritionTotals>((acc, entry) => ({
      calories: acc.calories + entry.calories,
      proteinGrams: acc.proteinGrams + entry.proteinGrams,
      carbsGrams: acc.carbsGrams + entry.carbsGrams,
      fatGrams: acc.fatGrams + entry.fatGrams,
    }), EMPTY_TOTALS),
    [nutritionEntries],
  );

  const groupedEntries = useMemo(() => {
    return (Object.keys(MEAL_LABELS) as MealType[]).map((mealType) => ({
      mealType,
      entries: nutritionEntries.filter((entry) => entry.mealType === mealType),
    }));
  }, [nutritionEntries]);

  const calorieRemaining = nutritionGoal.calories - totals.calories;

  const planRecommendation = useMemo(() => {
    const currentWeight = toNumber(plannerForm.currentWeight);
    const targetWeight = plannerForm.goal === 'recomp'
      ? currentWeight
      : toNumber(plannerForm.targetWeight);
    return buildNutritionPlanRecommendation({
      goal: plannerForm.goal,
      experienceLevel: profile.preferences.experienceLevel,
      weight: currentWeight,
      weightUnit: profile.weightUnit,
      targetWeight,
      weeks: toNumber(plannerForm.weeks),
    });
  }, [
    plannerForm.currentWeight,
    plannerForm.goal,
    plannerForm.targetWeight,
    plannerForm.weeks,
    profile.preferences.experienceLevel,
    profile.weightUnit,
  ]);

  const submitEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!entryForm.foodName.trim()) return;

    await saveNutritionEntry({
      id: entryForm.id,
      date: selectedDate,
      mealType: entryForm.mealType,
      foodName: entryForm.foodName,
      servingLabel: entryForm.servingLabel,
      calories: toNumber(entryForm.calories),
      proteinGrams: toNumber(entryForm.proteinGrams),
      carbsGrams: toNumber(entryForm.carbsGrams),
      fatGrams: toNumber(entryForm.fatGrams),
      notes: entryForm.notes,
    });
    setEntryForm(createEmptyForm(entryForm.mealType));
  };

  const submitGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await updateNutritionGoal({
      calories: toNumber(goalForm.calories),
      proteinGrams: toNumber(goalForm.proteinGrams),
      carbsGrams: toNumber(goalForm.carbsGrams),
      fatGrams: toNumber(goalForm.fatGrams),
    });
    setIsGoalOpen(false);
  };

  const toggleGoalForm = () => {
    if (!isGoalOpen) {
      setGoalForm({
        calories: String(nutritionGoal.calories),
        proteinGrams: String(nutritionGoal.proteinGrams),
        carbsGrams: String(nutritionGoal.carbsGrams),
        fatGrams: String(nutritionGoal.fatGrams),
      });
    }
    setIsGoalOpen((value) => !value);
  };

  const updatePlannerGoal = (goal: NutritionPlanGoal) => {
    setPlannerForm((form) => ({
      ...form,
      goal,
      targetWeight: goal === 'recomp' ? form.currentWeight : form.targetWeight,
    }));
  };

  const applyPlanRecommendation = async () => {
    if (!planRecommendation) return;
    await updateNutritionGoal({
      calories: planRecommendation.calories,
      proteinGrams: planRecommendation.proteinGrams,
      carbsGrams: planRecommendation.carbsGrams,
      fatGrams: planRecommendation.fatGrams,
    });
    setGoalForm({
      calories: String(planRecommendation.calories),
      proteinGrams: String(planRecommendation.proteinGrams),
      carbsGrams: String(planRecommendation.carbsGrams),
      fatGrams: String(planRecommendation.fatGrams),
    });
  };

  return (
    <motion.div
      key="nutrition"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-4 px-4 pb-48 overflow-y-auto no-scrollbar"
      id="main-content"
    >
      {NUTRITION_ENABLED && coachLoaded && (
        coachProfile
          ? <NutritionPlanCard profile={coachProfile} consumedKcal={totals.calories} />
          : <NutritionEmptyState />
      )}

      {NUTRITION_ENABLED && adaptive.pending && coachProfile && (
        <AdjustmentBanner
          pending={adaptive.pending}
          onApply={async () => {
            await adaptive.apply();
            // Refresh local view of profile so the plan card updates.
            const updated = await loadNutritionProfile();
            setCoachProfile(updated);
          }}
          onReject={adaptive.reject}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-10 bg-emerald-400 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.6)]" />
          <div>
            <h3 className="text-white font-black text-2xl sm:text-3xl tracking-tighter uppercase font-display leading-none">
              Nutrición
            </h3>
            <p className="text-[9px] font-black text-white/35 uppercase tracking-[0.3em] mt-0.5">
              Macros diarios
            </p>
          </div>
        </div>

        <label className="h-11 px-3 rounded-lg bg-white/[0.06] border border-white/10 flex items-center gap-2 text-white/70">
          <CalendarDays className="w-4 h-4" />
          <input
            aria-label="Fecha de nutrición"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="bg-transparent text-[12px] font-black outline-none text-white color-scheme-dark"
          />
        </label>
      </div>

      <section className="glass-panel rounded-[var(--radius-xl)] border-white/5 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.34em]">Hoy</p>
            <p className="text-4xl font-black font-display tracking-tighter text-white leading-none mt-1">
              {Math.round(totals.calories)}
              <span className="text-sm text-white/35 ml-1">kcal</span>
            </p>
          </div>
          <button
            type="button"
            onClick={toggleGoalForm}
            aria-label="Editar objetivos"
            className="w-11 h-11 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <ProgressBar value={totals.calories} total={nutritionGoal.calories} className="bg-emerald-400" />
        <p className={cn(
          'text-[11px] font-black uppercase tracking-[0.24em]',
          calorieRemaining >= 0 ? 'text-emerald-300/80' : 'text-orange-300/80',
        )}>
          {calorieRemaining >= 0 ? `${Math.round(calorieRemaining)} kcal restantes` : `${Math.abs(Math.round(calorieRemaining))} kcal sobre objetivo`}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <MacroCard label="Proteína" value={totals.proteinGrams} goal={nutritionGoal.proteinGrams} unit="g" className="text-blue-300" />
          <MacroCard label="Carbos" value={totals.carbsGrams} goal={nutritionGoal.carbsGrams} unit="g" className="text-amber-300" />
          <MacroCard label="Grasa" value={totals.fatGrams} goal={nutritionGoal.fatGrams} unit="g" className="text-rose-300" />
        </div>

        {isGoalOpen && (
          <form onSubmit={submitGoal} className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            {GOAL_FIELDS.map(({ key, label }) => (
              <label key={key} className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/35">{label}</span>
                <input
                  inputMode="decimal"
                  value={goalForm[key as keyof GoalForm]}
                  onChange={(event) => setGoalForm((form) => ({ ...form, [key]: event.target.value }))}
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-300/50"
                />
              </label>
            ))}
            <button
              type="submit"
              className="col-span-2 h-11 rounded-lg active-glass-btn flex items-center justify-center gap-2 text-sm font-black"
            >
              <Save className="w-4 h-4" />
              Guardar objetivos
            </button>
          </form>
        )}
      </section>

      <section className="glass-panel rounded-[var(--radius-xl)] border-white/5 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.34em]">Coach nutricional</p>
            <h4 className="text-white font-black text-xl tracking-tighter font-display leading-none mt-1">
              Objetivo por bloques
            </h4>
          </div>
          <div className={cn(
            'px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-[0.18em]',
            planRecommendation?.isWithinRecommendedRange
              ? 'bg-emerald-400/10 border-emerald-300/20 text-emerald-200'
              : 'bg-orange-400/10 border-orange-300/20 text-orange-200',
          )}>
            {planRecommendation?.paceLabel ?? 'Configura'}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {PLAN_GOALS.map(({ value, label, caption, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => updatePlannerGoal(value)}
              aria-pressed={plannerForm.goal === value}
              className={cn(
                'min-h-[76px] rounded-lg border p-3 text-left transition-colors',
                plannerForm.goal === value
                  ? 'bg-emerald-400/15 border-emerald-300/30 text-white'
                  : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/80',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-tight">{label}</span>
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-white/35 leading-snug">{caption}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/35">Peso actual</span>
            <input
              inputMode="decimal"
              value={plannerForm.currentWeight}
              onChange={(event) => setPlannerForm((form) => ({
                ...form,
                currentWeight: event.target.value,
                targetWeight: form.goal === 'recomp' ? event.target.value : form.targetWeight,
              }))}
              placeholder={profile.weightUnit}
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-300/50"
            />
          </label>

          <label className={cn('space-y-1', plannerForm.goal === 'recomp' && 'opacity-50')}>
            <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/35">Peso meta</span>
            <input
              inputMode="decimal"
              disabled={plannerForm.goal === 'recomp'}
              value={plannerForm.goal === 'recomp' ? plannerForm.currentWeight : plannerForm.targetWeight}
              onChange={(event) => setPlannerForm((form) => ({ ...form, targetWeight: event.target.value }))}
              placeholder={profile.weightUnit}
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-300/50 disabled:cursor-not-allowed"
            />
          </label>

          <label className="space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/35">Tiempo</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="4"
                max="52"
                step="1"
                value={Math.max(4, Math.min(52, toNumber(plannerForm.weeks) || 4))}
                onChange={(event) => setPlannerForm((form) => ({ ...form, weeks: event.target.value }))}
                className="min-w-0 flex-1 accent-emerald-300"
              />
              <input
                inputMode="numeric"
                value={plannerForm.weeks}
                onChange={(event) => setPlannerForm((form) => ({ ...form, weeks: event.target.value }))}
                className="w-16 rounded-lg bg-black/30 border border-white/10 px-2 py-2 text-sm font-black text-white outline-none focus:border-emerald-300/50"
              />
            </div>
          </label>

          <div className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/30">Rango recomendado</p>
            <p className="text-sm font-black text-white mt-1">
              {planRecommendation
                ? `${planRecommendation.recommendedWeeksMin}-${planRecommendation.recommendedWeeksMax} sem`
                : 'Completa datos'}
            </p>
            <p className="text-[10px] font-bold text-white/35 mt-0.5">
              {profile.preferences.experienceLevel}
            </p>
          </div>
        </div>

        {planRecommendation ? (
          <div className="rounded-lg bg-black/25 border border-white/10 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Preview en vivo</p>
                <p className="text-3xl font-black font-display tracking-tighter text-white leading-none mt-1">
                  {planRecommendation.calories}
                  <span className="text-sm text-white/35 ml-1">kcal</span>
                </p>
              </div>
              <Target className="w-5 h-5 text-emerald-300/70" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="text-blue-300 text-lg font-black">{planRecommendation.proteinGrams}g</p>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">Proteína</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="text-amber-300 text-lg font-black">{planRecommendation.carbsGrams}g</p>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">Carbos</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="text-rose-300 text-lg font-black">{planRecommendation.fatGrams}g</p>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">Grasa</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-[11px] font-bold text-white/45 leading-relaxed">
                {planRecommendation.summary}
              </p>
              <p className="text-[11px] font-bold text-white/45 leading-relaxed">
                Mantenimiento estimado: {planRecommendation.maintenanceCalories} kcal.
                {plannerForm.goal !== 'recomp' && ` Ritmo: ${planRecommendation.weeklyRatePercent.toFixed(2)}%/sem.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => applyPlanRecommendation().catch(console.error)}
              className="w-full h-11 rounded-lg active-glass-btn flex items-center justify-center gap-2 text-sm font-black"
            >
              <Save className="w-4 h-4" />
              Usar estos objetivos
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-white/[0.04] border border-white/10 p-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/35">
              Ingresa peso actual, peso meta y semanas para calcular kcal y macros.
            </p>
          </div>
        )}
      </section>

      <form onSubmit={submitEntry} className="glass-panel rounded-[var(--radius-xl)] border-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.34em]">
            {entryForm.id ? 'Editar comida' : 'Agregar comida'}
          </p>
          {entryForm.id && (
            <button
              type="button"
              onClick={() => setEntryForm(createEmptyForm(entryForm.mealType))}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45 hover:text-white"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(MEAL_LABELS) as MealType[]).map((mealType) => (
            <button
              key={mealType}
              type="button"
              onClick={() => setEntryForm((form) => ({ ...form, mealType }))}
              className={cn(
                'h-9 rounded-lg text-[10px] font-black uppercase tracking-tight transition-colors',
                entryForm.mealType === mealType
                  ? 'bg-white text-black'
                  : 'bg-white/[0.05] text-white/45 hover:text-white',
              )}
            >
              {MEAL_LABELS[mealType]}
            </button>
          ))}
        </div>

        <input
          required
          placeholder="Alimento"
          value={entryForm.foodName}
          onChange={(event) => setEntryForm((form) => ({ ...form, foodName: event.target.value }))}
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/20 focus:border-emerald-300/50"
        />

        <input
          placeholder="Porción (ej. 150g, 1 taza, 2 huevos)"
          value={entryForm.servingLabel}
          onChange={(event) => setEntryForm((form) => ({ ...form, servingLabel: event.target.value }))}
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/20 focus:border-emerald-300/50"
        />

        <div className="grid grid-cols-4 gap-2">
          {ENTRY_MACRO_FIELDS.map(({ key, label, icon: Icon }) => (
            <label key={key} className="space-y-1">
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tight text-white/35">
                <Icon className="w-3 h-3" />
                {label}
              </span>
              <input
                inputMode="decimal"
                value={entryForm[key]}
                onChange={(event) => setEntryForm((form) => ({ ...form, [key]: event.target.value }))}
                className="w-full rounded-lg bg-black/30 border border-white/10 px-2 py-2 text-sm font-bold text-white outline-none focus:border-emerald-300/50"
              />
            </label>
          ))}
        </div>

        <input
          placeholder="Notas opcionales"
          value={entryForm.notes}
          onChange={(event) => setEntryForm((form) => ({ ...form, notes: event.target.value }))}
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/20 focus:border-emerald-300/50"
        />

        <button type="submit" className="w-full h-12 rounded-lg active-glass-btn flex items-center justify-center gap-2 text-sm font-black">
          {entryForm.id ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {entryForm.id ? 'Guardar comida' : 'Agregar comida'}
        </button>
      </form>

      <section className="space-y-3 pb-10">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.34em] px-1">Registro del día</p>

        {nutritionEntries.length === 0 ? (
          <div className="glass-panel rounded-[var(--radius-xl)] border-white/5 px-6 py-10 text-center space-y-3">
            <Apple className="w-12 h-12 text-white/10 mx-auto" />
            <p className="text-white/40 font-black text-sm uppercase tracking-[0.18em]">Sin comidas registradas</p>
          </div>
        ) : (
          groupedEntries.map(({ mealType, entries }) => entries.length > 0 && (
            <div key={mealType} className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.26em] text-white/35 px-1">
                {MEAL_LABELS[mealType]}
              </h4>
              {entries.map((entry) => (
                <article key={entry.id} className="glass-panel rounded-[var(--radius-lg)] border-white/5 p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-black text-sm truncate">{entry.foodName}</p>
                    <p className="text-[11px] text-white/35 font-bold truncate">{entry.servingLabel}</p>
                    {entry.notes && <p className="text-[10px] text-white/25 mt-1 truncate">{entry.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-300 font-black text-sm">{Math.round(entry.calories)}</p>
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">kcal</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Editar comida"
                    onClick={() => setEntryForm(createFormFromEntry(entry))}
                    className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center text-white/45 hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar comida"
                    onClick={() => deleteNutritionEntry(entry.id).catch(console.error)}
                    className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center text-white/45 hover:text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </article>
              ))}
            </div>
          ))
        )}
      </section>
    </motion.div>
  );
}
