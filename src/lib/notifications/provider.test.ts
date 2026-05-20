import { beforeEach, describe, expect, it, vi } from 'vitest';

const webSchedule = vi.fn();
const nativeSchedule = vi.fn();
const nativePermission = vi.fn();
const nativeRequestPermission = vi.fn();
const nativeRuntime = vi.fn();
const webSupport = vi.fn();
const webPermission = vi.fn();
const nativePushRegister = vi.fn();

vi.mock('@/lib/push/client', () => ({
  cancelLocalNotification: vi.fn(),
  getNotificationPermission: webPermission,
  isPushActive: vi.fn(async () => false),
  isWebPushSupported: webSupport,
  registerSubscription: vi.fn(),
  requestBrowserNotificationPermission: vi.fn(async () => 'default'),
  scheduleLocalNotification: webSchedule,
  subscribeToPush: vi.fn(async () => null),
  unsubscribeFromPush: vi.fn(),
  PushSetupError: class PushSetupError extends Error {
    constructor(
      public readonly reason: string,
      message: string
    ) {
      super(message);
      this.name = 'PushSetupError';
    }
  },
}));

vi.mock('@/lib/notifications/native', () => ({
  cancelNativeLocalNotification: vi.fn(),
  ensureNativeNotificationChannels: vi.fn(),
  getNativeNotificationPermission: nativePermission,
  isNativeNotificationRuntime: nativeRuntime,
  registerNativePushNotifications: nativePushRegister,
  requestNativeNotificationPermission: nativeRequestPermission,
  scheduleNativeLocalNotification: nativeSchedule,
  toNativeNotificationId: (value: string) => value.length,
  NATIVE_NOTIFICATION_CHANNELS: {
    restTimers: 'rest-timers',
    streakReminders: 'streak-reminders',
  },
}));

vi.mock('@/lib/notifications/reminders', () => ({
  buildUpcomingStreakReminderSchedule: vi.fn(() => []),
  buildStreakReminderCopy: vi.fn(() => ({ title: 'x', body: 'y' })),
  getCurrentStreak: vi.fn(() => 0),
  getLocalDateKey: vi.fn(() => '2026-01-01'),
  normalizeReminderTime: vi.fn((value: string | null | undefined) => value ?? '20:00'),
}));

describe('notification provider selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    nativePushRegister.mockResolvedValue(null);
  });

  it('reports native mode when Capacitor is available', async () => {
    nativeRuntime.mockReturnValue(true);
    webSupport.mockReturnValue(false);

    const { getNotificationMode } = await import('./provider');
    expect(getNotificationMode()).toBe('native');
  });

  it('reports web mode when Web Push is available', async () => {
    nativeRuntime.mockReturnValue(false);
    webSupport.mockReturnValue(true);

    const { getNotificationMode } = await import('./provider');
    expect(getNotificationMode()).toBe('web');
  });

  it('falls back to unsupported mode when neither platform is available', async () => {
    nativeRuntime.mockReturnValue(false);
    webSupport.mockReturnValue(false);

    const { getNotificationMode } = await import('./provider');
    expect(getNotificationMode()).toBe('unsupported');
  });

  it('delegates local scheduling to the web provider on web', async () => {
    nativeRuntime.mockReturnValue(false);
    webSupport.mockReturnValue(true);
    webPermission.mockReturnValue('granted');

    const { scheduleLocalNotification } = await import('./provider');
    await scheduleLocalNotification({
      id: 'rest-1',
      delayMs: 1000,
      title: 'Rest',
      body: 'Done',
    });

    expect(webSchedule).toHaveBeenCalledWith({
      id: 'rest-1',
      delayMs: 1000,
      title: 'Rest',
      body: 'Done',
      tag: undefined,
      data: undefined,
    });
    expect(nativeSchedule).not.toHaveBeenCalled();
  });

  it('delegates local scheduling to the native provider on native', async () => {
    nativeRuntime.mockReturnValue(true);
    webSupport.mockReturnValue(false);
    nativePermission.mockResolvedValue('granted');

    const { scheduleLocalNotification } = await import('./provider');
    await scheduleLocalNotification({
      id: 'rest-1',
      delayMs: 1000,
      title: 'Rest',
      body: 'Done',
      data: { kind: 'rest-timer' },
    });

    expect(nativeSchedule).toHaveBeenCalledWith({
      id: 'rest-1',
      title: 'Rest',
      body: 'Done',
      delayMs: 1000,
      at: undefined,
      tag: undefined,
      channelId: undefined,
      allowWhileIdle: undefined,
      data: { kind: 'rest-timer' },
    });
    expect(webSchedule).not.toHaveBeenCalled();
  });

  it('enables native notifications without requiring FCM registration', async () => {
    nativeRuntime.mockReturnValue(true);
    webSupport.mockReturnValue(false);
    nativePermission
      .mockResolvedValueOnce('prompt')
      .mockResolvedValue('granted');
    nativeRequestPermission.mockResolvedValue('granted');

    const { enableNotifications, isNotificationsActive } = await import('./provider');
    await enableNotifications('access-token');

    await expect(isNotificationsActive('access-token')).resolves.toBe(true);
    expect(nativeRequestPermission).toHaveBeenCalledTimes(1);
    expect(nativePushRegister).not.toHaveBeenCalled();
  });

  it('clears native activation locally without calling FCM unregister', async () => {
    nativeRuntime.mockReturnValue(true);
    webSupport.mockReturnValue(false);
    nativePermission.mockResolvedValue('granted');

    const { enableNotifications, disableNotifications, isNotificationsActive } = await import('./provider');
    await enableNotifications();
    await expect(isNotificationsActive()).resolves.toBe(true);

    await disableNotifications('access-token');

    await expect(isNotificationsActive()).resolves.toBe(false);
    expect(nativePushRegister).not.toHaveBeenCalled();
  });
});
