'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { DEFAULT_NATIVE_APP_ID } from '@/lib/site';

export const NATIVE_NOTIFICATION_CHANNELS = {
  restTimers: 'rest-timers',
  streakReminders: 'streak-reminders',
} as const;

export type NativeNotificationChannelId = (typeof NATIVE_NOTIFICATION_CHANNELS)[keyof typeof NATIVE_NOTIFICATION_CHANNELS];

export type NativePlatform = 'ios' | 'android' | 'web';
export type NativeNotificationPermission =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'prompt-with-rationale'
  | 'unsupported';

export interface NativeLocalNotificationInput {
  id: string;
  title: string;
  body: string;
  at?: Date;
  delayMs?: number;
  tag?: string;
  channelId?: NativeNotificationChannelId;
  allowWhileIdle?: boolean;
  data?: Record<string, unknown>;
}

export interface NativePushRegistration {
  token: string;
  platform: Exclude<NativePlatform, 'web'>;
  appId: string;
}

interface CapacitorWindow extends Window {
  Capacitor?: {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
}

function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const capacitor = (window as CapacitorWindow).Capacitor;
  if (capacitor) {
    try {
      if (typeof capacitor.isNativePlatform === 'function') {
        return capacitor.isNativePlatform();
      }
      if (typeof capacitor.getPlatform === 'function') {
        return capacitor.getPlatform() !== 'web';
      }
    } catch {
      return false;
    }
  }

  try {
    return Capacitor.getPlatform() !== 'web';
  } catch {
    return false;
  }
}

export function getNativePlatform(): NativePlatform {
  if (!isNativeRuntime()) {
    return 'web';
  }

  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android' ? platform : 'web';
}

export function isNativeNotificationRuntime(): boolean {
  return getNativePlatform() !== 'web';
}

export function toNativeNotificationId(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  const normalized = hash >>> 0;
  return normalized === 0 ? 1 : normalized;
}

function normalizeNativePermission(value: string | undefined): NativeNotificationPermission {
  if (
    value === 'granted' ||
    value === 'denied' ||
    value === 'prompt' ||
    value === 'prompt-with-rationale'
  ) {
    return value;
  }

  return 'prompt';
}

async function readLocalPermissionState(): Promise<NativeNotificationPermission> {
  if (!isNativeNotificationRuntime()) {
    return 'unsupported';
  }

  const permissions = await LocalNotifications.checkPermissions();
  return normalizeNativePermission(permissions.display);
}

export async function getNativeNotificationPermission(): Promise<NativeNotificationPermission> {
  return readLocalPermissionState();
}

export async function requestNativeNotificationPermission(): Promise<NativeNotificationPermission> {
  if (!isNativeNotificationRuntime()) {
    return 'unsupported';
  }

  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted' || current.display === 'denied') {
    return normalizeNativePermission(current.display);
  }

  const requested = await LocalNotifications.requestPermissions();
  return normalizeNativePermission(requested.display);
}

export async function ensureNativeNotificationChannels(): Promise<void> {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  if (getNativePlatform() !== 'android') {
    return;
  }

  await Promise.all([
    LocalNotifications.createChannel({
      id: NATIVE_NOTIFICATION_CHANNELS.restTimers,
      name: 'Rest timers',
      description: 'Alerts when a rest timer completes.',
      importance: 4,
      vibration: true,
      sound: 'default',
    }),
    LocalNotifications.createChannel({
      id: NATIVE_NOTIFICATION_CHANNELS.streakReminders,
      name: 'Streak reminders',
      description: 'Daily reminders to keep your streak alive.',
      importance: 4,
      vibration: true,
      sound: 'default',
    }),
  ]);
}

export async function scheduleNativeLocalNotification(input: NativeLocalNotificationInput): Promise<void> {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  const permission = await getNativeNotificationPermission();
  if (permission !== 'granted') {
    return;
  }

  await ensureNativeNotificationChannels();

  const at = input.at ?? new Date(Date.now() + Math.max(0, input.delayMs ?? 0));
  const channelId = input.channelId ?? (
    input.data?.kind === 'streak-reminder'
      ? NATIVE_NOTIFICATION_CHANNELS.streakReminders
      : NATIVE_NOTIFICATION_CHANNELS.restTimers
  );

  await LocalNotifications.schedule({
    notifications: [
      {
        id: toNativeNotificationId(input.id),
        title: input.title,
        body: input.body,
        schedule: { at, allowWhileIdle: input.allowWhileIdle },
        channelId,
        sound: 'default',
        extra: input.data ?? undefined,
      },
    ],
  });
}

export async function cancelNativeLocalNotification(id: string): Promise<void> {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  await LocalNotifications.cancel({
    notifications: [{ id: toNativeNotificationId(id) }],
  });
}

export async function registerNativePushNotifications(): Promise<NativePushRegistration | null> {
  if (!isNativeNotificationRuntime()) {
    return null;
  }

  const permission = await requestNativeNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  const platform = getNativePlatform();
  if (platform === 'web') {
    return null;
  }

  let resolveToken: ((value: string) => void) | null = null;
  let rejectToken: ((error: Error) => void) | null = null;

  const tokenPromise = new Promise<string>((resolve, reject) => {
    resolveToken = resolve;
    rejectToken = reject;
  });

  const registrationHandle = await PushNotifications.addListener('registration', (event) => {
    if (!resolveToken) return;
    if (timeoutId) clearTimeout(timeoutId);
    resolveToken(event.value);
    resolveToken = null;
    rejectToken = null;
  });

  const errorHandle = await PushNotifications.addListener('registrationError', (event) => {
    if (!rejectToken) return;
    clearTimeout(timeoutId);
    rejectToken(new Error(event.error));
    resolveToken = null;
    rejectToken = null;
  });

  const timeoutId = setTimeout(() => {
    if (!rejectToken) return;
    rejectToken(new Error('Timed out waiting for push registration.'));
    resolveToken = null;
    rejectToken = null;
  }, 15_000);

  try {
    await PushNotifications.register();
    const token = await tokenPromise;
    return {
      token,
      platform,
      appId: DEFAULT_NATIVE_APP_ID,
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    clearTimeout(timeoutId);
    await Promise.resolve(registrationHandle.remove()).catch(() => {});
    await Promise.resolve(errorHandle.remove()).catch(() => {});
  }
}

export async function unregisterNativePushNotifications(): Promise<void> {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  await PushNotifications.unregister();
}
