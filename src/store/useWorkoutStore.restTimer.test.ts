import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDBSingleton } from '@/lib/db/index';
import { loadActiveSession, saveActiveSession } from '@/lib/db/activeSession';
import { saveProfile } from '@/lib/db/profile';
import { saveRoutine } from '@/lib/db/routines';
import type { RestTimerState, RoutineData, UserProfile } from '@/types/workout';

const BASE_TIME = new Date('2026-05-11T12:00:00.000Z');

const mocks = vi.hoisted(() => ({
  scheduleLocalNotification: vi.fn().mockResolvedValue(undefined),
  cancelLocalNotification: vi.fn().mockResolvedValue(undefined),
  reconcileAchievementsFromHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/notifications/provider', () => ({
  scheduleLocalNotification: mocks.scheduleLocalNotification,
  cancelLocalNotification: mocks.cancelLocalNotification,
}));

vi.mock('@/lib/achievements/reconcile', () => ({
  reconcileAchievementsFromHistory: mocks.reconcileAchievementsFromHistory,
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
        exercises: [
          {
            id: 'exercise-1',
            originalName: 'Bench Press',
            cleanName: 'Bench Press',
            sets: 3,
            repsMin: 8,
            repsMax: 10,
            restSeconds: 90,
            mediaUrl: null,
          },
        ],
      },
    ],
  };
}

function makeTimer(overrides: Partial<RestTimerState> = {}, referenceTime = BASE_TIME.getTime()): RestTimerState {
  return {
    id: 'timer-1',
    durationSeconds: 90,
    targetAt: new Date(referenceTime + 90_000),
    remainingMs: 90_000,
    status: 'running',
    ...overrides,
  };
}

async function loadStore() {
  vi.resetModules();
  const { useWorkoutStore } = await import('@/store/useWorkoutStore');
  return useWorkoutStore;
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  resetDBSingleton();
  vi.clearAllMocks();
});

describe('rest timer store actions', () => {
  it('starts a rest timer with a persisted targetAt and notification', async () => {
    const store = await loadStore();
    const profile = makeProfile();
    const routine = makeRoutine();
    const startedAt = Date.now();

    store.setState({
      currentRoutine: routine,
      currentView: 'active-session',
      activeSessionIdx: 0,
      setCompletion: {},
      sessionStartTime: BASE_TIME,
      restTimer: null,
      profile,
    });

    await store.getState().startRestTimer(90);

    const timer = store.getState().restTimer;
    expect(timer).not.toBeNull();
    expect(timer?.status).toBe('running');
    expect(timer?.durationSeconds).toBe(90);
    expect(timer?.remainingMs).toBe(90_000);
    expect(timer?.targetAt.getTime()).toBeGreaterThanOrEqual(startedAt + 89_000);
    expect(timer?.targetAt.getTime()).toBeLessThanOrEqual(startedAt + 91_000);
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleLocalNotification.mock.calls.at(-1)?.[0]).toMatchObject({
      id: timer?.id,
      channelId: 'rest-timers',
      title: 'Rest finished',
      body: 'You can log the next set now.',
      tag: timer?.id,
    });
    expect((mocks.scheduleLocalNotification.mock.calls.at(-1)?.[0] as { delayMs?: number } | undefined)?.delayMs)
      .toBeGreaterThanOrEqual(89_000);
    expect((mocks.scheduleLocalNotification.mock.calls.at(-1)?.[0] as { delayMs?: number } | undefined)?.delayMs)
      .toBeLessThanOrEqual(90_000);

    const activeSession = await loadActiveSession();
    expect(activeSession?.restTimer?.status).toBe('running');
    expect(activeSession?.restTimer?.targetAt).toBeDefined();
    expect(Math.abs(new Date(activeSession?.restTimer?.targetAt ?? '').getTime() - (timer?.targetAt.getTime() ?? 0)))
      .toBeLessThan(1_000);
  });

  it('pauses a timer, cancels the notification, and stores the remaining time', async () => {
    const store = await loadStore();
    const profile = makeProfile();
    const routine = makeRoutine();
    const now = Date.now();

    store.setState({
      currentRoutine: routine,
      currentView: 'active-session',
      activeSessionIdx: 0,
      setCompletion: {},
      sessionStartTime: BASE_TIME,
      restTimer: makeTimer({
        targetAt: new Date(now + 30_000),
        remainingMs: 30_000,
        status: 'running',
      }, now),
      profile,
    });

    await store.getState().pauseRestTimer();

    const timer = store.getState().restTimer;
    expect(timer?.status).toBe('paused');
    expect(timer?.remainingMs).toBeGreaterThan(29_000);
    expect(timer?.remainingMs).toBeLessThanOrEqual(30_000);
    expect(timer?.targetAt.getTime()).toBeGreaterThanOrEqual(now + 29_000);
    expect(timer?.targetAt.getTime()).toBeLessThanOrEqual(now + 30_000);
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledTimes(0);
    expect(mocks.cancelLocalNotification).toHaveBeenCalledTimes(1);

    const activeSession = await loadActiveSession();
    expect(activeSession?.restTimer?.status).toBe('paused');
    expect(activeSession?.restTimer?.remainingMs).toBeGreaterThan(29_000);
  });

  it('resumes a paused timer with a fresh targetAt and replacement notification', async () => {
    const store = await loadStore();
    const profile = makeProfile();
    const routine = makeRoutine();
    const now = Date.now();

    store.setState({
      currentRoutine: routine,
      currentView: 'active-session',
      activeSessionIdx: 0,
      setCompletion: {},
      sessionStartTime: BASE_TIME,
      restTimer: makeTimer({
        targetAt: new Date(now + 30_000),
        remainingMs: 30_000,
        status: 'paused',
      }, now),
      profile,
    });

    await store.getState().resumeRestTimer();

    const timer = store.getState().restTimer;
    expect(timer?.status).toBe('running');
    expect(timer?.remainingMs).toBe(30_000);
    expect(timer?.targetAt.getTime()).toBeGreaterThanOrEqual(now + 29_000);
    expect(timer?.targetAt.getTime()).toBeLessThanOrEqual(now + 31_000);
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleLocalNotification.mock.calls.at(-1)?.[0]).toMatchObject({
      id: timer?.id,
      channelId: 'rest-timers',
      title: 'Rest finished',
      body: 'You can log the next set now.',
      tag: timer?.id,
    });
    expect((mocks.scheduleLocalNotification.mock.calls.at(-1)?.[0] as { delayMs?: number } | undefined)?.delayMs)
      .toBeGreaterThanOrEqual(29_000);
    expect((mocks.scheduleLocalNotification.mock.calls.at(-1)?.[0] as { delayMs?: number } | undefined)?.delayMs)
      .toBeLessThanOrEqual(30_000);

    const activeSession = await loadActiveSession();
    expect(activeSession?.restTimer?.status).toBe('running');
    expect(activeSession?.restTimer?.targetAt).toBeDefined();
  });

  it('adjusts the target time and replaces the scheduled notification', async () => {
    const store = await loadStore();
    const profile = makeProfile();
    const routine = makeRoutine();
    const now = Date.now();

    store.setState({
      currentRoutine: routine,
      currentView: 'active-session',
      activeSessionIdx: 0,
      setCompletion: {},
      sessionStartTime: BASE_TIME,
      restTimer: makeTimer({
        targetAt: new Date(now + 30_000),
        remainingMs: 30_000,
        status: 'running',
      }, now),
      profile,
    });

    await store.getState().adjustRestTimer(15);

    const timer = store.getState().restTimer;
    expect(timer?.status).toBe('running');
    expect(timer?.remainingMs).toBeGreaterThan(44_000);
    expect(timer?.remainingMs).toBeLessThanOrEqual(45_000);
    expect(timer?.targetAt.getTime()).toBeGreaterThanOrEqual(now + 44_000);
    expect(timer?.targetAt.getTime()).toBeLessThanOrEqual(now + 45_000);
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleLocalNotification).toHaveBeenLastCalledWith(expect.objectContaining({
      id: timer?.id,
      delayMs: expect.any(Number),
      channelId: 'rest-timers',
    }));

    const activeSession = await loadActiveSession();
    expect(activeSession?.restTimer?.remainingMs).toBeGreaterThan(44_000);
  });

  it('can deliver an immediate notification when a visible timer finishes naturally', async () => {
    const store = await loadStore();
    const profile = makeProfile();
    const routine = makeRoutine();
    const now = Date.now();

    store.setState({
      currentRoutine: routine,
      currentView: 'active-session',
      activeSessionIdx: 0,
      setCompletion: {},
      sessionStartTime: BASE_TIME,
      restTimer: makeTimer({
        targetAt: new Date(now),
        remainingMs: 0,
        status: 'running',
      }, now),
      profile,
    });

    await store.getState().finishRestTimer({ notify: true });

    const timer = store.getState().restTimer;
    expect(timer?.status).toBe('finished');
    expect(mocks.cancelLocalNotification).toHaveBeenCalledWith('timer-1');
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: 'timer-1',
      delayMs: 0,
      channelId: 'rest-timers',
      allowWhileIdle: true,
      title: 'Rest finished',
      body: 'You can log the next set now.',
    }));
  });

  it('cancels a scheduled rest notification when a new session replaces the timer', async () => {
    const store = await loadStore();
    const profile = makeProfile();
    const routine = makeRoutine();
    const now = Date.now();

    store.setState({
      currentRoutine: routine,
      currentView: 'active-session',
      activeSessionIdx: 0,
      setCompletion: {},
      sessionStartTime: BASE_TIME,
      restTimer: makeTimer({
        targetAt: new Date(now + 30_000),
        remainingMs: 30_000,
        status: 'running',
      }, now),
      profile,
    });

    await store.getState().startSession(0);

    expect(store.getState().restTimer).toBeNull();
    expect(mocks.cancelLocalNotification).toHaveBeenCalledWith('timer-1');
  });
});

describe('rest timer hydration', () => {
  it('restores a running timer and reschedules its notification on hydrate', async () => {
    const now = Date.now();
    await saveProfile(makeProfile());
    await saveRoutine(makeRoutine(), '');
    await saveActiveSession('routine-1', 'session-1', 0, {}, {
      startedAt: BASE_TIME,
      restTimer: makeTimer({
        targetAt: new Date(now + 45_000),
        remainingMs: 45_000,
        status: 'running',
      }, now),
    });

    const store = await loadStore();
    await store.getState().hydrate();

    const timer = store.getState().restTimer;
    expect(timer?.status).toBe('running');
    expect(timer?.remainingMs).toBeGreaterThan(44_000);
    expect(timer?.remainingMs).toBeLessThanOrEqual(45_000);
    expect(timer?.targetAt.getTime()).toBeGreaterThanOrEqual(now + 44_000);
    expect(timer?.targetAt.getTime()).toBeLessThanOrEqual(now + 45_000);
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: 'timer-1',
      delayMs: expect.any(Number),
      channelId: 'rest-timers',
    }));
  });

  it('restores a paused timer without scheduling a notification', async () => {
    const now = Date.now();
    await saveProfile(makeProfile());
    await saveRoutine(makeRoutine(), '');
    await saveActiveSession('routine-1', 'session-1', 0, {}, {
      startedAt: BASE_TIME,
      restTimer: makeTimer({
        targetAt: new Date(now + 45_000),
        remainingMs: 45_000,
        status: 'paused',
      }, now),
    });

    const store = await loadStore();
    await store.getState().hydrate();

    const timer = store.getState().restTimer;
    expect(timer?.status).toBe('paused');
    expect(timer?.remainingMs).toBeGreaterThan(44_000);
    expect(timer?.remainingMs).toBeLessThanOrEqual(45_000);
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledTimes(0);
    expect(mocks.cancelLocalNotification).toHaveBeenCalledWith('timer-1');
  });

  it('marks expired timers finished and clears them after five seconds', async () => {
    const now = Date.now();
    await saveProfile(makeProfile());
    await saveRoutine(makeRoutine(), '');
    await saveActiveSession('routine-1', 'session-1', 0, {}, {
      startedAt: BASE_TIME,
      restTimer: makeTimer({
        targetAt: new Date(now - 1_000),
        remainingMs: 0,
        status: 'running',
      }, now),
    });

    const store = await loadStore();
    await store.getState().hydrate();

    expect(store.getState().restTimer?.status).toBe('finished');
    expect(store.getState().restTimer?.remainingMs).toBe(0);
    expect(mocks.scheduleLocalNotification).toHaveBeenCalledTimes(0);
    await store.getState().clearRestTimer();
    expect(store.getState().restTimer).toBeNull();

    const activeSession = await loadActiveSession();
    expect(activeSession?.restTimer).toBeNull();
  });
});
