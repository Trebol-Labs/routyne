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

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
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
