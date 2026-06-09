'use client';

import {
  cancelLocalNotification as cancelWebLocalNotification,
  getNotificationPermission as getWebNotificationPermission,
  isPushActive as isWebPushActive,
  isWebPushSupported,
  registerSubscription,
  requestBrowserNotificationPermission,
  scheduleLocalNotification as scheduleWebLocalNotificationApi,
  subscribeToPush,
  unsubscribeFromPush,
  PushSetupError,
} from '@/lib/push/client';
import { buildUpcomingStreakReminderSchedule, buildUpcomingDailyReminderSchedule, buildStreakReminderCopy, buildWeightReminderCopy, buildMealReminderCopy, getCurrentStreak, normalizeReminderTime, getLocalDateKey } from '@/lib/notifications/reminders';
import {
  cancelNativeLocalNotification,
  ensureNativeNotificationChannels,
  getNativeNotificationPermission,
  isNativeNotificationRuntime,
  registerNativePushNotifications,
  requestNativeNotificationPermission,
  scheduleNativeLocalNotification,
  toNativeNotificationId,
  type NativeNotificationChannelId,
  type NativeNotificationPermission,
  type NativeLocalNotificationInput,
} from '@/lib/notifications/native';
import { DEFAULT_NATIVE_APP_ID } from '@/lib/site';
import type {
  HistoryEntry,
  AppLanguage,
  UserProfile,
} from '@/types/workout';

export type NotificationMode = 'native' | 'web' | 'unsupported';

export interface NotificationPermissionResult {
  permission: NotificationPermission | 'unsupported';
  mode: NotificationMode;
}

export interface LocalNotificationRequest {
  id: string;
  delayMs?: number;
  at?: Date;
  title: string;
  body: string;
  tag?: string;
  allowWhileIdle?: boolean;
  data?: {
    kind?: string;
    url?: string;
    [key: string]: unknown;
  };
  channelId?: NativeNotificationChannelId;
}

export interface StreakReminderSyncInput {
  profile: Pick<UserProfile, 'displayName' | 'restDays' | 'preferences'>;
  history: Array<Pick<HistoryEntry, 'completedAt'>>;
  now?: Date;
  horizonDays?: number;
}

export interface WeightReminderSyncInput {
  profile: Pick<UserProfile, 'displayName' | 'preferences'>;
  /** Local date key (YYYY-MM-DD) if the user already logged weight today, to skip today's reminder. */
  weighedTodayDateKey?: string | null;
  now?: Date;
  horizonDays?: number;
}

export interface MealReminderSyncInput {
  profile: Pick<UserProfile, 'displayName' | 'preferences'>;
  now?: Date;
  horizonDays?: number;
}

interface NativeDevicePayload {
  deviceId: string;
  token: string;
  platform: 'ios' | 'android';
  appId: string;
  provider: 'fcm';
}

const DEVICE_ID_KEY = 'routyne-native-device-id';
const DEVICE_TOKEN_KEY = 'routyne-native-device-token';
const DEVICE_PLATFORM_KEY = 'routyne-native-device-platform';
const DEVICE_APP_ID_KEY = 'routyne-native-device-app-id';
const DEVICE_PROVIDER_KEY = 'routyne-native-device-provider';
const NATIVE_NOTIFICATIONS_ENABLED_KEY = 'routyne-native-notifications-enabled';
const STREAK_TIMEZONE_KEY = 'routyne-native-streak-timezone';
const STREAK_REMINDER_TIME_KEY = 'routyne-native-streak-reminder-time';
const STREAK_HORIZON_KEY = 'routyne-native-streak-horizon-days';
const WEIGHT_TIMEZONE_KEY = 'routyne-native-weight-timezone';
const WEIGHT_TIMES_KEY = 'routyne-native-weight-times';
const WEIGHT_HORIZON_KEY = 'routyne-native-weight-horizon-days';
const MEAL_TIMEZONE_KEY = 'routyne-native-meal-timezone';
const MEAL_TIMES_KEY = 'routyne-native-meal-times';
const MEAL_HORIZON_KEY = 'routyne-native-meal-horizon-days';
const DEFAULT_REMINDER_HORIZON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredValue(key: string): string | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage failures in private mode or quota-constrained sessions.
  }
}

function removeStoredValue(key: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function getOrCreateNativeDeviceId(): string | null {
  const existing = readStoredValue(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const id = crypto.randomUUID();
    writeStoredValue(DEVICE_ID_KEY, id);
    return id;
  }

  const fallback = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  writeStoredValue(DEVICE_ID_KEY, fallback);
  return fallback;
}

function getStoredNativeToken(): string | null {
  return readStoredValue(DEVICE_TOKEN_KEY);
}

function setStoredNativeToken(payload: NativeDevicePayload): void {
  writeStoredValue(DEVICE_TOKEN_KEY, payload.token);
  writeStoredValue(DEVICE_PLATFORM_KEY, payload.platform);
  writeStoredValue(DEVICE_APP_ID_KEY, payload.appId);
  writeStoredValue(DEVICE_PROVIDER_KEY, payload.provider);
}

function clearStoredNativeToken(): void {
  removeStoredValue(DEVICE_TOKEN_KEY);
  removeStoredValue(DEVICE_PLATFORM_KEY);
  removeStoredValue(DEVICE_APP_ID_KEY);
  removeStoredValue(DEVICE_PROVIDER_KEY);
}

function isNativeNotificationsEnabled(): boolean {
  return readStoredValue(NATIVE_NOTIFICATIONS_ENABLED_KEY) === 'true';
}

function setNativeNotificationsEnabled(): void {
  writeStoredValue(NATIVE_NOTIFICATIONS_ENABLED_KEY, 'true');
}

function clearNativeNotificationsEnabled(): void {
  removeStoredValue(NATIVE_NOTIFICATIONS_ENABLED_KEY);
}

function isNativePushRegistrationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NATIVE_PUSH_ENABLED === 'true';
}

function storeNativeStreakReminderConfig(timezone: string, reminderTime: string, horizonDays: number): void {
  writeStoredValue(STREAK_TIMEZONE_KEY, timezone);
  writeStoredValue(STREAK_REMINDER_TIME_KEY, reminderTime);
  writeStoredValue(STREAK_HORIZON_KEY, String(horizonDays));
}

function readNativeStreakReminderConfig(): { timezone: string; horizonDays: number } | null {
  const timezone = readStoredValue(STREAK_TIMEZONE_KEY);
  if (!timezone) {
    return null;
  }

  const horizon = Number.parseInt(readStoredValue(STREAK_HORIZON_KEY) ?? '', 10);
  return {
    timezone,
    horizonDays: Number.isFinite(horizon) && horizon > 0 ? horizon : DEFAULT_REMINDER_HORIZON_DAYS,
  };
}

function clearStoredNativeStreakReminderConfig(): void {
  removeStoredValue(STREAK_TIMEZONE_KEY);
  removeStoredValue(STREAK_REMINDER_TIME_KEY);
  removeStoredValue(STREAK_HORIZON_KEY);
}

function mapNativePermission(permission: NativeNotificationPermission): NotificationPermission | 'unsupported' {
  if (permission === 'unsupported') {
    return 'unsupported';
  }
  if (permission === 'prompt' || permission === 'prompt-with-rationale') {
    return 'default';
  }
  return permission;
}

function getPlatformMode(): NotificationMode {
  if (isNativeNotificationRuntime()) {
    return 'native';
  }

  if (isWebPushSupported()) {
    return 'web';
  }

  return 'unsupported';
}

async function getNativePermissionState(): Promise<NotificationPermission | 'unsupported'> {
  return mapNativePermission(await getNativeNotificationPermission());
}

async function requestNativePermissionState(): Promise<NotificationPermission | 'unsupported'> {
  const permission = await getNativeNotificationPermission();
  if (permission === 'granted' || permission === 'denied') {
    return mapNativePermission(permission);
  }

  return mapNativePermission(await requestNativeNotificationPermission());
}

async function registerNativeDeviceOnServer(accessToken?: string): Promise<boolean> {
  if (!accessToken) {
    return false;
  }

  const token = getStoredNativeToken();
  const deviceId = getOrCreateNativeDeviceId();
  const platform = readStoredValue(DEVICE_PLATFORM_KEY);
  const appId = readStoredValue(DEVICE_APP_ID_KEY) ?? DEFAULT_NATIVE_APP_ID;

  if (!token || !deviceId || (platform !== 'ios' && platform !== 'android')) {
    return false;
  }

  const response = await fetch('/api/push/devices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      deviceId,
      token,
      platform,
      provider: readStoredValue(DEVICE_PROVIDER_KEY) ?? 'fcm',
      appId,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Native device registration failed (${response.status})`);
  }

  return true;
}

async function unregisterNativeDeviceOnServer(accessToken?: string): Promise<void> {
  if (!accessToken) {
    return;
  }

  const token = getStoredNativeToken();
  if (!token) {
    return;
  }

  const deviceId = getOrCreateNativeDeviceId();
  if (!deviceId) {
    return;
  }

  const response = await fetch('/api/push/devices', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Native device removal failed (${response.status})`);
  }
}

async function syncNativeRegistration(accessToken?: string): Promise<boolean> {
  if (!isNativeNotificationRuntime()) {
    return false;
  }

  if (!isNativePushRegistrationEnabled()) {
    return false;
  }

  const permission = await getNativePermissionState();
  if (permission !== 'granted') {
    return false;
  }

  const token = getStoredNativeToken();
  if (!token) {
    return false;
  }

  return registerNativeDeviceOnServer(accessToken);
}

async function refreshNativePushRegistration(accessToken?: string): Promise<void> {
  if (!isNativePushRegistrationEnabled()) {
    return;
  }

  try {
    if (!getStoredNativeToken()) {
      const requested = await registerNativePushNotifications();
      if (!requested) {
        return;
      }

      setStoredNativeToken({
        deviceId: getOrCreateNativeDeviceId() ?? 'device',
        token: requested.token,
        platform: requested.platform,
        appId: requested.appId,
        provider: 'fcm',
      });
    }

    await syncNativeRegistration(accessToken);
  } catch (error) {
    console.error('[notifications/provider] native push registration failed', error);
  }
}

async function scheduleWebLocalNotificationSafe(input: LocalNotificationRequest): Promise<void> {
  const permission = getWebNotificationPermission();
  if (permission !== 'granted') {
    return;
  }

  await scheduleWebLocalNotificationApi({
    id: input.id,
    delayMs: input.delayMs ?? Math.max(0, input.at ? input.at.getTime() - Date.now() : 0),
    title: input.title,
    body: input.body,
    tag: input.tag,
    data: input.data,
  });
}

async function scheduleNativeLocalNotificationSafe(input: LocalNotificationRequest): Promise<void> {
  const payload: NativeLocalNotificationInput = {
    id: input.id,
    title: input.title,
    body: input.body,
    at: input.at,
    delayMs: input.delayMs,
    tag: input.tag,
    channelId: input.channelId,
    allowWhileIdle: input.allowWhileIdle,
    data: input.data,
  };
  await scheduleNativeLocalNotification(payload);
}

async function cancelPendingNativeStreakReminders(
  timezone: string,
  now: Date,
  horizonDays: number
): Promise<void> {
  const removals: Promise<void>[] = [];
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const candidate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const dateKey = getLocalDateKey(candidate, timezone);
    removals.push(cancelNativeLocalNotification(`routyne-streak-${dateKey}`));
  }
  await Promise.all(removals);
}

async function cancelStoredNativeStreakReminders(): Promise<void> {
  const stored = readNativeStreakReminderConfig();
  if (!stored) {
    return;
  }

  await cancelPendingNativeStreakReminders(stored.timezone, new Date(), stored.horizonDays);
}

async function schedulePendingStreakReminders(input: StreakReminderSyncInput): Promise<void> {
  const now = input.now ?? new Date();
  const timezone = input.profile.preferences.timezone;
  const horizonDays = Math.max(1, Math.min(90, Math.floor(input.horizonDays ?? DEFAULT_REMINDER_HORIZON_DAYS)));
  const reminderTime = normalizeReminderTime(input.profile.preferences.streakReminderTime);
  const currentStreak = getCurrentStreak({
    history: input.history.map((entry) => ({ completedAt: new Date(entry.completedAt) })),
    restDays: input.profile.restDays,
    timezone,
    now,
  });
  const reminderCopy = buildStreakReminderCopy({
    displayName: input.profile.displayName,
    currentStreak,
    language: input.profile.preferences.language as AppLanguage,
  });

  const storedConfig = readNativeStreakReminderConfig();
  if (storedConfig) {
    await cancelPendingNativeStreakReminders(storedConfig.timezone, now, storedConfig.horizonDays);
  }

  storeNativeStreakReminderConfig(timezone, reminderTime, horizonDays);

  const schedule = buildUpcomingStreakReminderSchedule({
    history: input.history.map((entry) => ({ completedAt: new Date(entry.completedAt) })),
    restDays: input.profile.restDays,
    timezone,
    reminderTime,
    now,
    horizonDays,
  });

  await Promise.all(schedule.map((item) => scheduleNativeLocalNotificationSafe({
    id: item.id,
    title: reminderCopy.title,
    body: reminderCopy.body,
    at: item.scheduledFor,
    channelId: 'streak-reminders',
    data: {
      kind: 'streak-reminder',
      url: '/',
      dateKey: item.dateKey,
      currentStreak,
      displayName: input.profile.displayName,
      reminderTime,
    },
  })));
}

async function clearPendingStreakReminders(): Promise<void> {
  await cancelStoredNativeStreakReminders();
  clearStoredNativeStreakReminderConfig();
}

async function syncNativeStreakReminders(input: StreakReminderSyncInput): Promise<void> {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  const permission = await getNativePermissionState();
  if (permission !== 'granted') {
    await clearPendingStreakReminders();
    return;
  }

  if (!input.profile.preferences.streakReminderEnabled) {
    await clearPendingStreakReminders();
    return;
  }

  if (!isNativeNotificationsEnabled()) {
    await clearPendingStreakReminders();
    return;
  }

  await schedulePendingStreakReminders(input);
}

function parseStoredTimes(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function cancelPendingDailyReminders(
  idPrefix: string,
  timezone: string,
  times: string[],
  now: Date,
  horizonDays: number
): Promise<void> {
  if (times.length === 0) {
    return;
  }

  const removals: Promise<void>[] = [];
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const candidate = new Date(now.getTime() + offset * DAY_MS);
    const dateKey = getLocalDateKey(candidate, timezone);
    for (const time of times) {
      const label = normalizeReminderTime(time).replace(':', '');
      removals.push(cancelNativeLocalNotification(`${idPrefix}-${dateKey}-${label}`));
    }
  }
  await Promise.all(removals);
}

function storeDailyReminderConfig(
  timezoneKey: string,
  timesKey: string,
  horizonKey: string,
  timezone: string,
  times: string[],
  horizonDays: number
): void {
  writeStoredValue(timezoneKey, timezone);
  writeStoredValue(timesKey, times.join(','));
  writeStoredValue(horizonKey, String(horizonDays));
}

function readDailyReminderConfig(
  timezoneKey: string,
  timesKey: string,
  horizonKey: string
): { timezone: string; times: string[]; horizonDays: number } | null {
  const timezone = readStoredValue(timezoneKey);
  if (!timezone) {
    return null;
  }

  const horizon = Number.parseInt(readStoredValue(horizonKey) ?? '', 10);
  return {
    timezone,
    times: parseStoredTimes(readStoredValue(timesKey)),
    horizonDays: Number.isFinite(horizon) && horizon > 0 ? horizon : DEFAULT_REMINDER_HORIZON_DAYS,
  };
}

function clearDailyReminderConfig(timezoneKey: string, timesKey: string, horizonKey: string): void {
  removeStoredValue(timezoneKey);
  removeStoredValue(timesKey);
  removeStoredValue(horizonKey);
}

async function clearPendingWeightReminders(): Promise<void> {
  const stored = readDailyReminderConfig(WEIGHT_TIMEZONE_KEY, WEIGHT_TIMES_KEY, WEIGHT_HORIZON_KEY);
  if (stored) {
    await cancelPendingDailyReminders('routyne-weight', stored.timezone, stored.times, new Date(), stored.horizonDays);
  }
  clearDailyReminderConfig(WEIGHT_TIMEZONE_KEY, WEIGHT_TIMES_KEY, WEIGHT_HORIZON_KEY);
}

async function clearPendingMealReminders(): Promise<void> {
  const stored = readDailyReminderConfig(MEAL_TIMEZONE_KEY, MEAL_TIMES_KEY, MEAL_HORIZON_KEY);
  if (stored) {
    await cancelPendingDailyReminders('routyne-meal', stored.timezone, stored.times, new Date(), stored.horizonDays);
  }
  clearDailyReminderConfig(MEAL_TIMEZONE_KEY, MEAL_TIMES_KEY, MEAL_HORIZON_KEY);
}

async function syncNativeWeightReminders(input: WeightReminderSyncInput): Promise<void> {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  const permission = await getNativePermissionState();
  if (
    permission !== 'granted' ||
    !input.profile.preferences.weightReminderEnabled ||
    !isNativeNotificationsEnabled()
  ) {
    await clearPendingWeightReminders();
    return;
  }

  const now = input.now ?? new Date();
  const timezone = input.profile.preferences.timezone;
  const horizonDays = Math.max(1, Math.min(90, Math.floor(input.horizonDays ?? DEFAULT_REMINDER_HORIZON_DAYS)));
  const reminderTime = normalizeReminderTime(input.profile.preferences.weightReminderTime);
  const times = [reminderTime];

  const stored = readDailyReminderConfig(WEIGHT_TIMEZONE_KEY, WEIGHT_TIMES_KEY, WEIGHT_HORIZON_KEY);
  if (stored) {
    await cancelPendingDailyReminders('routyne-weight', stored.timezone, stored.times, now, stored.horizonDays);
  }
  storeDailyReminderConfig(WEIGHT_TIMEZONE_KEY, WEIGHT_TIMES_KEY, WEIGHT_HORIZON_KEY, timezone, times, horizonDays);

  const skipDateKeys = new Set<string>();
  const todayKey = getLocalDateKey(now, timezone);
  if (input.weighedTodayDateKey === todayKey) {
    skipDateKeys.add(todayKey);
  }

  const reminderCopy = buildWeightReminderCopy({
    displayName: input.profile.displayName,
    language: input.profile.preferences.language as AppLanguage,
  });

  const schedule = buildUpcomingDailyReminderSchedule({
    idPrefix: 'routyne-weight',
    times,
    timezone,
    now,
    horizonDays,
    skipDateKeys,
  });

  await Promise.all(schedule.map((item) => scheduleNativeLocalNotificationSafe({
    id: item.id,
    title: reminderCopy.title,
    body: reminderCopy.body,
    at: item.scheduledFor,
    channelId: 'weight-reminders',
    data: {
      kind: 'weight-reminder',
      url: '/',
      dateKey: item.dateKey,
    },
  })));
}

async function syncNativeMealReminders(input: MealReminderSyncInput): Promise<void> {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  const permission = await getNativePermissionState();
  const times = input.profile.preferences.mealReminderTimes.map((time) => normalizeReminderTime(time));
  if (
    permission !== 'granted' ||
    !input.profile.preferences.mealRemindersEnabled ||
    !isNativeNotificationsEnabled() ||
    times.length === 0
  ) {
    await clearPendingMealReminders();
    return;
  }

  const now = input.now ?? new Date();
  const timezone = input.profile.preferences.timezone;
  const horizonDays = Math.max(1, Math.min(90, Math.floor(input.horizonDays ?? DEFAULT_REMINDER_HORIZON_DAYS)));

  const stored = readDailyReminderConfig(MEAL_TIMEZONE_KEY, MEAL_TIMES_KEY, MEAL_HORIZON_KEY);
  if (stored) {
    await cancelPendingDailyReminders('routyne-meal', stored.timezone, stored.times, now, stored.horizonDays);
  }
  storeDailyReminderConfig(MEAL_TIMEZONE_KEY, MEAL_TIMES_KEY, MEAL_HORIZON_KEY, timezone, times, horizonDays);

  const reminderCopy = buildMealReminderCopy({
    displayName: input.profile.displayName,
    language: input.profile.preferences.language as AppLanguage,
  });

  const schedule = buildUpcomingDailyReminderSchedule({
    idPrefix: 'routyne-meal',
    times,
    timezone,
    now,
    horizonDays,
  });

  await Promise.all(schedule.map((item) => scheduleNativeLocalNotificationSafe({
    id: item.id,
    title: reminderCopy.title,
    body: reminderCopy.body,
    at: item.scheduledFor,
    channelId: 'meal-reminders',
    data: {
      kind: 'meal-reminder',
      url: '/',
      dateKey: item.dateKey,
    },
  })));
}

export function getNotificationMode(): NotificationMode {
  return getPlatformMode();
}

export async function getNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  const mode = getPlatformMode();
  if (mode === 'native') {
    return getNativePermissionState();
  }

  if (mode === 'web') {
    return getWebNotificationPermission();
  }

  return 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  const mode = getPlatformMode();
  if (mode === 'native') {
    return requestNativePermissionState();
  }

  if (mode === 'web') {
    return requestBrowserNotificationPermission();
  }

  return 'unsupported';
}

export async function isNotificationsActive(accessToken?: string): Promise<boolean> {
  const mode = getPlatformMode();
  if (mode === 'native') {
    const permission = await getNativePermissionState();
    if (permission !== 'granted') {
      return false;
    }

    const active = isNativeNotificationsEnabled() || !!getStoredNativeToken();
    if (!active) {
      return false;
    }

    void refreshNativePushRegistration(accessToken);
    return true;
  }

  if (mode === 'web') {
    return isWebPushActive();
  }

  return false;
}

export async function enableNotifications(accessToken?: string): Promise<void> {
  const mode = getPlatformMode();
  if (mode === 'native') {
    await ensureNativeNotificationChannels();
    const permission = await requestNativePermissionState();
    if (permission !== 'granted') {
      return;
    }

    setNativeNotificationsEnabled();
    void refreshNativePushRegistration(accessToken);
    return;
  }

  if (mode === 'web') {
    const sub = await subscribeToPush();
    if (!sub) {
      return;
    }

    try {
      await registerSubscription(sub, accessToken);
    } catch (error) {
      await sub.unsubscribe().catch((unsubscribeError: unknown) => {
        console.error('[notifications/provider] rollback unsubscribe failed', unsubscribeError);
      });
      throw error;
    }

    return;
  }

  throw new PushSetupError('unsupported', 'This device does not support notifications.');
}

export async function disableNotifications(accessToken?: string): Promise<void> {
  const mode = getPlatformMode();
  if (mode === 'native') {
    try {
      await unregisterNativeDeviceOnServer(accessToken);
    } finally {
      clearNativeNotificationsEnabled();
      clearStoredNativeToken();
      await Promise.all([
        clearPendingStreakReminders(),
        clearPendingWeightReminders(),
        clearPendingMealReminders(),
      ]);
    }
    return;
  }

  if (mode === 'web') {
    await unsubscribeFromPush(accessToken);
  }
}

export async function scheduleLocalNotification(input: LocalNotificationRequest): Promise<void> {
  const mode = getPlatformMode();
  if (mode === 'native') {
    await scheduleNativeLocalNotificationSafe(input);
    return;
  }

  if (mode === 'web') {
    await scheduleWebLocalNotificationSafe(input);
  }
}

export async function cancelLocalNotification(id: string): Promise<void> {
  const mode = getPlatformMode();
  if (mode === 'native') {
    await cancelNativeLocalNotification(id);
    return;
  }

  if (mode === 'web') {
    await cancelWebLocalNotification(id);
  }
}

export async function testNotification(options: {
  title: string;
  body: string;
  kind?: string;
  url?: string;
  channelId?: NativeNotificationChannelId;
}): Promise<void> {
  await scheduleLocalNotification({
    id: `routyne-test-${toNativeNotificationId(`${options.kind ?? 'test'}-${options.title}-${options.body}`)}`,
    delayMs: 1_000,
    title: options.title,
    body: options.body,
    tag: `routyne-test-${options.kind ?? 'default'}`,
    data: {
      kind: options.kind ?? 'test',
      url: options.url ?? '/',
    },
    channelId: options.channelId,
  });
}

export async function syncStreakReminderNotifications(input: StreakReminderSyncInput): Promise<void> {
  await syncNativeStreakReminders(input);
}

export async function syncWeightReminderNotifications(input: WeightReminderSyncInput): Promise<void> {
  await syncNativeWeightReminders(input);
}

export async function syncMealReminderNotifications(input: MealReminderSyncInput): Promise<void> {
  await syncNativeMealReminders(input);
}
