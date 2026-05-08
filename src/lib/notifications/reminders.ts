import type { AppLanguage } from '@/types/workout';

export function getLocalDateKey(date: Date, timeZone: string): string {
  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function getLocalDayOfWeek(date: Date, timeZone: string): number {
  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimeZone,
    weekday: 'short',
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export interface ReminderTimeParts {
  hour: number;
  minute: number;
}

export interface StreakReminderScheduleItem {
  id: string;
  dateKey: string;
  scheduledFor: Date;
}

export interface StreakReminderCopy {
  title: string;
  body: string;
}

const DEFAULT_REMINDER_TIME = '20:00';
const DAY_MS = 24 * 60 * 60 * 1000;

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return { year, month, day };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '01');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '01');
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '00');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '00');
  const second = Number(parts.find((part) => part.type === 'second')?.value ?? '00');

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asUtc - date.getTime()) / 60000;
}

function createZonedDate(
  dateKey: string,
  timeZone: string,
  hour: number,
  minute: number,
  second = 0
): Date {
  const parts = parseDateKey(dateKey);
  if (!parts) {
    return new Date(NaN);
  }

  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const baseUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second);
  let utc = baseUtc;

  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMinutes(new Date(utc), safeTimeZone);
    const nextUtc = baseUtc - offset * 60_000;
    if (nextUtc === utc) break;
    utc = nextUtc;
  }

  return new Date(utc);
}

function getDateKeyAtOffset(dateKey: string, timeZone: string, offsetDays: number): string {
  const anchor = createZonedDate(dateKey, timeZone, 12, 0);
  if (Number.isNaN(anchor.getTime())) {
    return dateKey;
  }

  const candidate = new Date(anchor.getTime() + offsetDays * DAY_MS);
  return getLocalDateKey(candidate, timeZone);
}

function isFulfilledOnDate(params: {
  date: Date;
  history: Array<{ completedAt: Date }>;
  restDays: number[];
  timezone: string;
}): boolean {
  const dateKey = getLocalDateKey(params.date, params.timezone);
  const dayOfWeek = getLocalDayOfWeek(params.date, params.timezone);

  return params.restDays.includes(dayOfWeek) || params.history.some(
    (entry) => getLocalDateKey(new Date(entry.completedAt), params.timezone) === dateKey
  );
}

export function parseReminderTime(value: string): ReminderTimeParts | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function normalizeReminderTime(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return DEFAULT_REMINDER_TIME;
  }

  const parsed = parseReminderTime(value);
  if (!parsed) {
    return DEFAULT_REMINDER_TIME;
  }

  return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
}

export function formatReminderTime(hour: number, minute: number): string {
  const safeHour = Math.max(0, Math.min(23, Math.floor(hour)));
  const safeMinute = Math.max(0, Math.min(59, Math.floor(minute)));
  return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`;
}

export function getCurrentStreak(params: {
  history: Array<{ completedAt: Date }>;
  restDays: number[];
  timezone: string;
  now?: Date;
}): number {
  const now = params.now ?? new Date();
  const todayFulfilled = isFulfilledOnDate({
    date: now,
    history: params.history,
    restDays: params.restDays,
    timezone: params.timezone,
  });

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFulfilled = isFulfilledOnDate({
    date: yesterday,
    history: params.history,
    restDays: params.restDays,
    timezone: params.timezone,
  });

  if (!todayFulfilled && !yesterdayFulfilled) {
    return 0;
  }

  const cursor = todayFulfilled ? new Date(now) : yesterday;
  let streak = 0;
  while (isFulfilledOnDate({
    date: cursor,
    history: params.history,
    restDays: params.restDays,
    timezone: params.timezone,
  })) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function shouldSendStreakReminder(params: {
  history: Array<{ completedAt: Date }>;
  restDays: number[];
  timezone: string;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  const todayKey = getLocalDateKey(now, params.timezone);
  const todayDow = getLocalDayOfWeek(now, params.timezone);

  if (params.restDays.includes(todayDow)) {
    return false;
  }

  return !params.history.some(
    (entry) => getLocalDateKey(new Date(entry.completedAt), params.timezone) === todayKey
  );
}

export function buildUpcomingStreakReminderSchedule(params: {
  history: Array<{ completedAt: Date }>;
  restDays: number[];
  timezone: string;
  reminderTime: string;
  now?: Date;
  horizonDays?: number;
}): StreakReminderScheduleItem[] {
  const now = params.now ?? new Date();
  const safeTimeZone = isValidTimeZone(params.timezone) ? params.timezone : 'UTC';
  const time = parseReminderTime(normalizeReminderTime(params.reminderTime)) ?? { hour: 20, minute: 0 };
  const todayKey = getLocalDateKey(now, safeTimeZone);
  const horizonDays = Math.max(1, Math.min(90, Math.floor(params.horizonDays ?? 30)));
  const anchorDateKey = getDateKeyAtOffset(todayKey, safeTimeZone, 0);
  const schedule: StreakReminderScheduleItem[] = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const dateKey = getDateKeyAtOffset(anchorDateKey, safeTimeZone, offset);
    const scheduledFor = createZonedDate(dateKey, safeTimeZone, time.hour, time.minute);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= now.getTime()) {
      continue;
    }

    const day = new Date(scheduledFor);
    if (params.restDays.includes(getLocalDayOfWeek(day, safeTimeZone))) {
      continue;
    }

    if (params.history.some(
      (entry) => getLocalDateKey(new Date(entry.completedAt), safeTimeZone) === dateKey
    )) {
      continue;
    }

    schedule.push({
      id: `routyne-streak-${dateKey}`,
      dateKey,
      scheduledFor,
    });
  }

  return schedule;
}

function normalizeDisplayName(displayName: string | null | undefined): string {
  const value = typeof displayName === 'string' ? displayName.trim() : '';
  return value || 'Routyne';
}

export function buildStreakReminderCopy(params: {
  displayName: string | null | undefined;
  currentStreak: number;
  language: AppLanguage;
}): StreakReminderCopy {
  const displayName = normalizeDisplayName(params.displayName);

  if (params.language === 'en') {
    return {
      title: `${displayName}, time to train`,
      body: params.currentStreak > 0
        ? `You're on a ${params.currentStreak}-day streak. Train today to keep it alive.`
        : 'Start a new streak today.',
    };
  }

  return {
    title: `${displayName}, hora de entrenar`,
    body: params.currentStreak > 0
      ? `Llevas una racha de ${params.currentStreak} días. Entrena hoy para mantenerla viva.`
      : 'Empieza una nueva racha hoy.',
  };
}
