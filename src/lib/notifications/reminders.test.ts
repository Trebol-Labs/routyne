import { describe, expect, it } from 'vitest';
import {
  buildStreakReminderCopy,
  buildUpcomingStreakReminderSchedule,
  buildUpcomingDailyReminderSchedule,
  getLocalDayOfWeek,
  getCurrentStreak,
  getLongestFulfilledStreak,
  normalizeReminderTime,
  shouldSendStreakReminder,
} from './reminders';

describe('reminder time helpers', () => {
  it('normalizes invalid reminder times to the default', () => {
    expect(normalizeReminderTime('')).toBe('20:00');
    expect(normalizeReminderTime('99:99')).toBe('20:00');
    expect(normalizeReminderTime('7:3')).toBe('20:00');
    expect(normalizeReminderTime('07:30')).toBe('07:30');
  });
});

describe('daily reminder scheduling', () => {
  it('schedules one item per future day and time, discarding past times', () => {
    const now = new Date('2026-04-01T12:00:00Z');
    const schedule = buildUpcomingDailyReminderSchedule({
      idPrefix: 'routyne-meal',
      times: ['08:00', '20:00'],
      timezone: 'UTC',
      now,
      horizonDays: 2,
    });

    // Day 1 (today): 08:00 is past, 20:00 future → 1; Day 2: both future → 2.
    expect(schedule).toHaveLength(3);
    expect(schedule[0].id).toBe('routyne-meal-2026-04-01-2000');
    expect(schedule[0].scheduledFor.toISOString()).toBe('2026-04-01T20:00:00.000Z');
    expect(schedule.map((item) => item.id)).toEqual([
      'routyne-meal-2026-04-01-2000',
      'routyne-meal-2026-04-02-0800',
      'routyne-meal-2026-04-02-2000',
    ]);
  });

  it('skips dates listed in skipDateKeys (already-logged days)', () => {
    const now = new Date('2026-04-01T06:00:00Z');
    const schedule = buildUpcomingDailyReminderSchedule({
      idPrefix: 'routyne-weight',
      times: ['08:00'],
      timezone: 'UTC',
      now,
      horizonDays: 2,
      skipDateKeys: new Set(['2026-04-01']),
    });

    expect(schedule).toHaveLength(1);
    expect(schedule[0].dateKey).toBe('2026-04-02');
  });

  it('deduplicates colliding time labels into a single daily item', () => {
    const now = new Date('2026-04-01T00:00:00Z');
    const schedule = buildUpcomingDailyReminderSchedule({
      idPrefix: 'routyne-meal',
      times: ['08:00', '08:00'],
      timezone: 'UTC',
      now,
      horizonDays: 1,
    });

    expect(schedule).toHaveLength(1);
    expect(schedule[0].id).toBe('routyne-meal-2026-04-01-0800');
  });
});

describe('streak reminder scheduling', () => {
  it('skips rest days and completed days when scheduling reminders', () => {
    const now = new Date('2026-04-01T12:00:00Z');
    const schedule = buildUpcomingStreakReminderSchedule({
      history: [{ completedAt: new Date('2026-04-01T08:00:00Z') }],
      restDays: [0],
      timezone: 'UTC',
      reminderTime: '20:00',
      now,
      horizonDays: 2,
    });

    expect(schedule).toHaveLength(1);
    expect(schedule[0].dateKey).toBe('2026-04-02');
    expect(schedule[0].scheduledFor.toISOString()).toBe('2026-04-02T20:00:00.000Z');
  });

  it('computes the current streak using local timezone dates', () => {
    const streak = getCurrentStreak({
      history: [
        { completedAt: new Date('2026-04-01T08:00:00Z') },
        { completedAt: new Date('2026-03-31T08:00:00Z') },
        { completedAt: new Date('2026-03-30T08:00:00Z') },
      ],
      restDays: [],
      timezone: 'UTC',
      now: new Date('2026-04-01T12:00:00Z'),
    });

    expect(streak).toBe(3);
  });

  it('counts rest days and timezone-local dates when computing the longest streak', () => {
    const timezone = 'America/New_York';
    const restDay = getLocalDayOfWeek(new Date('2026-04-02T12:00:00Z'), timezone);

    const streak = getLongestFulfilledStreak({
      history: [
        { completedAt: new Date('2026-04-02T02:30:00Z') },
        { completedAt: new Date('2026-04-04T02:30:00Z') },
      ],
      restDays: [restDay],
      timezone,
    });

    expect(streak).toBe(3);
  });

  it('builds personalized copy in both languages', () => {
    expect(
      buildStreakReminderCopy({
        displayName: 'Sierra',
        currentStreak: 5,
        language: 'en',
      })
    ).toEqual({
      title: 'Sierra, time to train',
      body: "You're on a 5-day streak. Train today to keep it alive.",
    });

    expect(
      buildStreakReminderCopy({
        displayName: 'Sierra',
        currentStreak: 0,
        language: 'es',
      })
    ).toEqual({
      title: 'Sierra, hora de entrenar',
      body: 'Empieza una nueva racha hoy.',
    });
  });

  it('only sends a streak reminder when today is not a rest or workout day', () => {
    expect(
      shouldSendStreakReminder({
        history: [{ completedAt: new Date('2026-04-01T08:00:00Z') }],
        restDays: [],
        timezone: 'UTC',
        now: new Date('2026-04-01T12:00:00Z'),
      })
    ).toBe(false);

    expect(
      shouldSendStreakReminder({
        history: [],
        restDays: [3],
        timezone: 'UTC',
        now: new Date('2026-04-01T12:00:00Z'),
      })
    ).toBe(false);
  });
});
