import type { AppLanguage } from '@/types/workout';

export function getLocalDateKey(date: Date, timeZone: string): string {
  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  if (safeTimeZone === 'UTC') {
    return formatUtcDateKey(date);
  }

  const parts = getDateKeyFormatter(safeTimeZone).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function getLocalDayOfWeek(date: Date, timeZone: string): number {
  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  if (safeTimeZone === 'UTC') {
    return date.getUTCDay();
  }

  const parts = getWeekdayFormatter(safeTimeZone).formatToParts(date);
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
const timeZoneValidityCache = new Map<string, boolean>();
const dateKeyFormatters = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function isValidTimeZone(timeZone: string): boolean {
  const cached = timeZoneValidityCache.get(timeZone);
  if (cached !== undefined) {
    return cached;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    timeZoneValidityCache.set(timeZone, true);
    return true;
  } catch {
    timeZoneValidityCache.set(timeZone, false);
    return false;
  }
}

function formatUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateKeyFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  dateKeyFormatters.set(timeZone, formatter);
  return formatter;
}

function getWeekdayFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = weekdayFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  });
  weekdayFormatters.set(timeZone, formatter);
  return formatter;
}

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = offsetFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  offsetFormatters.set(timeZone, formatter);
  return formatter;
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
  if (timeZone === 'UTC') {
    return 0;
  }

  const parts = getOffsetFormatter(timeZone).formatToParts(date);

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
  if (safeTimeZone === 'UTC') {
    return new Date(baseUtc);
  }

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
  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  if (safeTimeZone === 'UTC') {
    const parts = parseDateKey(dateKey);
    if (!parts) {
      return dateKey;
    }
    return formatUtcDateKey(new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays)));
  }

  const anchor = createZonedDate(dateKey, safeTimeZone, 12, 0);
  if (Number.isNaN(anchor.getTime())) {
    return dateKey;
  }

  const candidate = new Date(anchor.getTime() + offsetDays * DAY_MS);
  return getLocalDateKey(candidate, safeTimeZone);
}

function isFulfilledOnDate(params: {
  date: Date;
  historyDateKeys: Set<string>;
  restDays: number[];
  timezone: string;
}): boolean {
  const dateKey = getLocalDateKey(params.date, params.timezone);
  const dayOfWeek = getLocalDayOfWeek(params.date, params.timezone);

  return params.restDays.includes(dayOfWeek) || params.historyDateKeys.has(dateKey);
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
  const historyDateKeys = new Set(
    params.history.map((entry) => getLocalDateKey(new Date(entry.completedAt), params.timezone))
  );
  const todayFulfilled = isFulfilledOnDate({
    date: now,
    historyDateKeys,
    restDays: params.restDays,
    timezone: params.timezone,
  });

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFulfilled = isFulfilledOnDate({
    date: yesterday,
    historyDateKeys,
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
    historyDateKeys,
    restDays: params.restDays,
    timezone: params.timezone,
  })) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getLongestFulfilledStreak(params: {
  history: Array<{ completedAt: Date }>;
  restDays: number[];
  timezone: string;
}): number {
  if (params.history.length === 0) {
    return 0;
  }

  const historyDateKeys = new Set(
    params.history.map((entry) => getLocalDateKey(new Date(entry.completedAt), params.timezone))
  );
  const dateKeys = [...historyDateKeys].sort();

  if (dateKeys.length === 0) {
    return 0;
  }

  let longest = 0;
  let current = 0;
  let cursor = dateKeys[0];
  const lastDateKey = dateKeys[dateKeys.length - 1];

  while (true) {
    const fulfilled = isFulfilledOnDate({
      date: createZonedDate(cursor, params.timezone, 12, 0),
      historyDateKeys,
      restDays: params.restDays,
      timezone: params.timezone,
    });

    if (fulfilled) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }

    if (cursor === lastDateKey) {
      break;
    }

    cursor = getDateKeyAtOffset(cursor, params.timezone, 1);
  }

  return longest;
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
  const historyDateKeys = new Set(
    params.history.map((entry) => getLocalDateKey(new Date(entry.completedAt), params.timezone))
  );

  if (params.restDays.includes(todayDow)) {
    return false;
  }

  return !historyDateKeys.has(todayKey);
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
  const historyDateKeys = new Set(
    params.history.map((entry) => getLocalDateKey(new Date(entry.completedAt), safeTimeZone))
  );
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

    if (historyDateKeys.has(dateKey)) {
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
