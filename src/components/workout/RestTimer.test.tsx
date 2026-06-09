import { render, screen, act, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDBSingleton } from '@/lib/db/index';
import type { RestTimerState, RoutineData, UserProfile } from '@/types/workout';

const mocks = vi.hoisted(() => ({
  scheduleLocalNotification: vi.fn().mockResolvedValue(undefined),
  cancelLocalNotification: vi.fn().mockResolvedValue(undefined),
  useI18n: vi.fn(),
}));

vi.mock('@/lib/notifications/provider', () => ({
  scheduleLocalNotification: mocks.scheduleLocalNotification,
  cancelLocalNotification: mocks.cancelLocalNotification,
}));

vi.mock('@/components/i18n/LanguageProvider', () => ({
  useI18n: () => mocks.useI18n(),
}));

function makeProfile(): UserProfile {
  return {
    displayName: 'Sierra',
    avatarEmoji: '🏋️',
    weightUnit: 'kg',
    heightCm: 165,
    defaultRestSeconds: 90,
    restDays: [],
    preferences: {
      trainingGoal: 'strength',
      experienceLevel: 'beginner',
      weekStartsOn: 1,
      effortTracking: 'both',
      coachTone: 'supportive',
      accentColor: 'blue',
      uiDensity: 'comfortable',
      motionLevel: 'system',
      reducedMotion: false,
      language: 'en',
      streakReminderEnabled: false,
      streakReminderTime: '20:00',
      weightReminderEnabled: true,
      weightReminderTime: '08:00',
      mealRemindersEnabled: false,
      mealReminderTimes: ['08:00', '13:00', '20:00'],
      timerNotificationsEnabled: true,
      timezone: 'UTC',
    },
    updatedAt: '2026-05-11T12:00:00.000Z',
  };
}

function makeRoutine(): RoutineData {
  return {
    id: 'routine-1',
    title: 'Upper Day',
    createdAt: new Date('2026-05-01T12:00:00.000Z'),
    sessions: [
      {
        id: 'session-1',
        title: 'Session 1',
        exercises: [],
      },
    ],
  };
}

function makeTimer(overrides: Partial<RestTimerState> = {}, referenceTime = Date.now()): RestTimerState {
  return {
    id: 'timer-1',
    durationSeconds: 60,
    targetAt: new Date(referenceTime - 1_000),
    remainingMs: 0,
    status: 'running',
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  resetDBSingleton();
  vi.clearAllMocks();
  mocks.useI18n.mockReturnValue({
    language: 'en',
    setLanguage: vi.fn(),
    t: {
      notifications: {
        title: 'Rest complete',
        body: 'You can start the next set.',
      },
    },
  });
});

describe('RestTimer', () => {
  it('shows 0:00 at completion, calls onFinish once, and clears after five seconds', async () => {
    const { useWorkoutStore } = await import('@/store/useWorkoutStore');
    const { RestTimer } = await import('./RestTimer');
    const now = Date.now();

    useWorkoutStore.setState({
      currentRoutine: makeRoutine(),
      currentView: 'active-session',
      activeSessionIdx: 0,
      setCompletion: {},
      sessionStartTime: new Date(now),
      restTimer: makeTimer({}, now),
      profile: makeProfile(),
    });

    const onFinish = vi.fn();
    render(<RestTimer onFinish={onFinish} />);

    expect(screen.getByText('0:00')).toBeInTheDocument();

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useWorkoutStore.getState().restTimer?.status).toBe('finished'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5_250));
    });

    expect(useWorkoutStore.getState().restTimer).toBeNull();
    expect(screen.queryByText('0:00')).toBeNull();
  }, 10_000);
});
