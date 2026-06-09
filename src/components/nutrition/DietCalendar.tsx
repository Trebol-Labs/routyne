'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { loadNutritionCaloriesByDateRange } from '@/lib/db/nutrition';
import { cn } from '@/lib/utils';

interface DietCalendarProps {
  goalCalories: number;
  selectedDate: string;
  onSelectDay: (date: string) => void;
  refreshKey: number | string;
}

interface DayCell {
  dateKey: string;
}

type CalendarState = 'neutral' | 'deficit' | 'excess' | 'done';

interface CalendarColors {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

const MONTH_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
};

const DATE_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
};

// Green when on target, red on both sides (over and under). The arrow icon
// disambiguates excess vs. deficit, per the requested red↔green scale.
const STATE_COLORS: Record<CalendarState, CalendarColors> = {
  neutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.10)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    textColor: 'rgba(255, 255, 255, 0.30)',
  },
  deficit: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: 'rgba(239, 68, 68, 0.55)',
    textColor: 'rgb(254, 202, 202)',
  },
  excess: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: 'rgba(239, 68, 68, 0.55)',
    textColor: 'rgb(254, 202, 202)',
  },
  done: {
    backgroundColor: 'rgba(34, 197, 94, 0.24)',
    borderColor: 'rgba(34, 197, 94, 0.58)',
    textColor: 'rgb(187, 247, 208)',
  },
};

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00Z`);
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function startOfMonth(dateKey: string): Date {
  const date = parseDateKey(dateKey);
  date.setUTCDate(1);
  return date;
}

function addMonths(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + delta);
  next.setUTCDate(1);
  return next;
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
}

function buildMonthCells(cursor: Date): Array<DayCell | null> {
  const firstDay = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1, 12));
  const daysInMonth = endOfMonth(cursor).getUTCDate();
  const leadingBlanks = (firstDay.getUTCDay() + 6) % 7;
  const cells: Array<DayCell | null> = Array.from({ length: leadingBlanks }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), day, 12));
    cells.push({ dateKey: formatDateKey(date) });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getAdherenceState(consumed: number, goal: number, dateKey: string): CalendarState {
  const todayKey = formatDateKey(new Date());
  const isFuture = dateKey > todayKey;
  if (consumed <= 0 || goal <= 0 || isFuture) return 'neutral';

  const deviationPct = Math.abs(1 - consumed / goal);
  if (deviationPct <= 0.07) return 'done';
  return consumed > goal ? 'excess' : 'deficit';
}

export function DietCalendar({
  goalCalories,
  selectedDate,
  onSelectDay,
  refreshKey,
}: DietCalendarProps) {
  const { t, language } = useI18n();
  const c = t.nutritionView.calendar;
  const days = t.nutritionView.setup.days;
  const locale = language === 'en' ? 'en-US' : 'es-ES';
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(selectedDate));
  const [totalsByDate, setTotalsByDate] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const start = formatDateKey(new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 1, 12)));
      const end = formatDateKey(endOfMonth(monthCursor));
      const totals = await loadNutritionCaloriesByDateRange(start, end);
      if (cancelled) return;
      setTotalsByDate(totals);
    })().catch((error) => {
      console.error('[DietCalendar] failed to load totals', error);
    });

    return () => {
      cancelled = true;
    };
  }, [monthCursor, refreshKey]);

  const monthLabel = useMemo(
    () => capitalize(new Intl.DateTimeFormat(locale, MONTH_LABEL_OPTIONS).format(monthCursor)),
    [locale, monthCursor],
  );

  const cells = useMemo(() => buildMonthCells(monthCursor), [monthCursor]);
  const todayKey = formatDateKey(new Date());

  // Detail line for the currently selected day.
  const selectedConsumed = Math.round(totalsByDate[selectedDate] ?? 0);
  const selectedState = getAdherenceState(selectedConsumed, goalCalories, selectedDate);
  const selectedDelta = selectedConsumed - Math.round(goalCalories);
  const selectedDateLabel = capitalize(
    new Intl.DateTimeFormat(locale, DATE_LABEL_OPTIONS).format(parseDateKey(selectedDate)),
  );

  const legend: { state: CalendarState; label: string }[] = [
    { state: 'done', label: c.legendDone },
    { state: 'excess', label: c.legendExcess },
    { state: 'deficit', label: c.legendDeficit },
    { state: 'neutral', label: c.legendNoData },
  ];

  return (
    <section className="glass-panel rounded-[var(--radius-xl)] border-white/5 p-4 space-y-4">
      <div>
        <h4 className="text-white font-black text-lg tracking-tighter font-display leading-none">
          {c.title}
        </h4>
        <p className="text-[11px] font-bold text-white/40 mt-1 leading-snug">{c.subtitle}</p>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMonthCursor((current) => addMonths(current, -1))}
          aria-label={c.previousMonth}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p aria-live="polite" className="text-sm font-black uppercase tracking-[0.16em] text-white tabular-nums">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => setMonthCursor((current) => addMonths(current, 1))}
          aria-label={c.nextMonth}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_KEYS.map((key) => (
          <div
            key={key}
            className="text-center text-xs font-black uppercase tracking-[0.06em] text-white/45"
          >
            {days[key]}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`blank-${index}`} className="aspect-square" />;
          }

          const consumed = Math.round(totalsByDate[cell.dateKey] ?? 0);
          const state = getAdherenceState(consumed, goalCalories, cell.dateKey);
          const colors = STATE_COLORS[state];
          const isSelected = cell.dateKey === selectedDate;
          const isToday = cell.dateKey === todayKey;
          const dayNumber = parseDateKey(cell.dateKey).getUTCDate();

          const dateLabel = capitalize(
            new Intl.DateTimeFormat(locale, DATE_LABEL_OPTIONS).format(parseDateKey(cell.dateKey)),
          );
          const stateLabel =
            state === 'done' ? c.legendDone
            : state === 'excess' ? c.legendExcess
            : state === 'deficit' ? c.legendDeficit
            : c.legendNoData;
          const ariaLabel = state === 'neutral'
            ? `${dateLabel}, ${stateLabel}`
            : `${dateLabel}, ${consumed} kcal, ${stateLabel}`;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onSelectDay(cell.dateKey)}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border transition-transform duration-150 hover:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/40',
                isSelected && 'ring-2 ring-white/80',
              )}
              style={{
                backgroundColor: colors.backgroundColor,
                borderColor: isToday ? 'rgba(255,255,255,0.55)' : colors.borderColor,
              }}
            >
              <span
                className="text-sm font-black leading-none tabular-nums sm:text-base"
                style={{ color: colors.textColor }}
              >
                {dayNumber}
              </span>
              {state === 'done' && <Check className="size-2.5 text-emerald-200" strokeWidth={3} />}
              {state === 'excess' && <ArrowUp className="size-2.5 text-red-200" strokeWidth={3} />}
              {state === 'deficit' && <ArrowDown className="size-2.5 text-red-200" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
          {selectedDateLabel}
        </p>
        {selectedState === 'neutral' ? (
          <p className="text-sm font-bold text-white/50 mt-1">{c.legendNoData}</p>
        ) : (
          <p className="text-sm font-black text-white mt-1 tabular-nums">
            {selectedConsumed} <span className="text-white/40">/ {Math.round(goalCalories)} kcal</span>
            {selectedState === 'done' ? (
              <span className="ml-2 text-emerald-300">· {c.legendDone}</span>
            ) : selectedDelta > 0 ? (
              <span className="ml-2 text-red-300">· +{selectedDelta} {c.overSuffix}</span>
            ) : (
              <span className="ml-2 text-red-300">· {Math.abs(selectedDelta)} {c.underSuffix}</span>
            )}
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {legend.map(({ state, label }) => (
          <div key={state} className="flex items-center gap-1.5">
            <span
              className="flex size-3.5 items-center justify-center rounded-[5px] border"
              style={{
                backgroundColor: STATE_COLORS[state].backgroundColor,
                borderColor: STATE_COLORS[state].borderColor,
              }}
            >
              {state === 'done' && <Check className="size-2 text-emerald-200" strokeWidth={3.5} />}
              {state === 'excess' && <ArrowUp className="size-2 text-red-200" strokeWidth={3.5} />}
              {state === 'deficit' && <ArrowDown className="size-2 text-red-200" strokeWidth={3.5} />}
            </span>
            <span className="text-[10px] font-bold text-white/45">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
