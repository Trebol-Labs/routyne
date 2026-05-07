'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Apple,
  Beef,
  CalendarDays,
  Flame,
  Pencil,
  Plus,
  Save,
  Trash2,
  Wheat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { cn } from '@/lib/utils';
import type { MealType, NutritionEntry, NutritionTotals } from '@/types/workout';

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

const GOAL_FIELDS: { key: keyof GoalForm; label: string }[] = [
  { key: 'calories', label: 'Kcal' },
  { key: 'proteinGrams', label: 'Proteína' },
  { key: 'carbsGrams', label: 'Carbos' },
  { key: 'fatGrams', label: 'Grasa' },
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

  useEffect(() => {
    loadNutritionDay(selectedDate).catch(console.error);
  }, [loadNutritionDay, selectedDate]);

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

  return (
    <motion.div
      key="nutrition"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-4 px-4 pb-48 overflow-y-auto"
      id="main-content"
    >
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
