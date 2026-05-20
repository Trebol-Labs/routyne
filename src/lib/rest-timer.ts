import { cancelLocalNotification, scheduleLocalNotification } from '@/lib/notifications/provider';
import { translations } from '@/lib/i18n/translations';
import type { AppLanguage, RestTimerState } from '@/types/workout';
import type { RestTimerRecord } from '@/lib/db/schema';

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function serializeRestTimer(timer: RestTimerState | null | undefined): RestTimerRecord | null {
  if (!timer) {
    return null;
  }

  return {
    id: timer.id,
    durationSeconds: timer.durationSeconds,
    targetAt: timer.targetAt.toISOString(),
    remainingMs: Math.max(0, Math.round(timer.remainingMs)),
    status: timer.status,
  };
}

export function deserializeRestTimer(timer: RestTimerRecord | null | undefined): RestTimerState | null {
  if (!timer) {
    return null;
  }

  const targetAt = new Date(timer.targetAt);
  if (!isValidDate(targetAt)) {
    return null;
  }

  return {
    id: timer.id,
    durationSeconds: timer.durationSeconds,
    targetAt,
    remainingMs: Math.max(0, Math.round(timer.remainingMs)),
    status: timer.status,
  };
}

export function normalizeRestTimerState(
  timer: RestTimerState | null | undefined,
  now = new Date()
): RestTimerState | null {
  if (!timer) {
    return null;
  }

  const targetAt = timer.targetAt instanceof Date ? timer.targetAt : new Date(timer.targetAt);
  if (!isValidDate(targetAt)) {
    return null;
  }

  const currentRemainingMs = timer.status === 'running'
    ? Math.max(0, targetAt.getTime() - now.getTime())
    : Math.max(0, Math.round(timer.remainingMs));

  const status = currentRemainingMs <= 0 ? 'finished' : timer.status;

  return {
    ...timer,
    targetAt,
    remainingMs: status === 'running' ? currentRemainingMs : (status === 'finished' ? 0 : currentRemainingMs),
    status,
  };
}

export function getRestTimerRemainingMs(timer: RestTimerState, now = new Date()): number {
  if (timer.status === 'running') {
    return Math.max(0, timer.targetAt.getTime() - now.getTime());
  }

  return Math.max(0, Math.round(timer.remainingMs));
}

export function getRestTimerNotificationCopy(language: AppLanguage): { title: string; body: string } {
  const notifications = translations[language].notifications;
  return {
    title: notifications.restTitle,
    body: notifications.restBody,
  };
}

export async function syncRestTimerNotification(params: {
  timer: RestTimerState | null;
  previousTimerId?: string | null;
  language: AppLanguage;
  enabled: boolean;
  notifyFinished?: boolean;
}): Promise<void> {
  const idsToCancel = new Set<string>();

  if (params.previousTimerId) {
    idsToCancel.add(params.previousTimerId);
  }

  if (params.timer) {
    idsToCancel.add(params.timer.id);
  }

  await Promise.all([...idsToCancel].map((id) => cancelLocalNotification(id)));

  if (!params.enabled || !params.timer) {
    return;
  }

  const copy = getRestTimerNotificationCopy(params.language);

  if (params.timer.status === 'finished') {
    if (!params.notifyFinished) {
      return;
    }

    await scheduleLocalNotification({
      id: params.timer.id,
      delayMs: 0,
      title: copy.title,
      body: copy.body,
      tag: params.timer.id,
      allowWhileIdle: true,
      data: {
        kind: 'rest-timer',
        url: '/',
      },
      channelId: 'rest-timers',
    });
    return;
  }

  if (params.timer.status !== 'running') {
    return;
  }

  const delayMs = Math.max(0, params.timer.targetAt.getTime() - Date.now());
  if (delayMs <= 0) {
    return;
  }

  await scheduleLocalNotification({
    id: params.timer.id,
    delayMs,
    title: copy.title,
    body: copy.body,
    tag: params.timer.id,
    allowWhileIdle: true,
    data: {
      kind: 'rest-timer',
      url: '/',
    },
    channelId: 'rest-timers',
  });
}
