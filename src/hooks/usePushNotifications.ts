'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  subscribeToPush,
  registerSubscription,
  unsubscribeFromPush,
  isPushActive,
  scheduleLocalNotification,
  cancelLocalNotification,
  getNotificationPermission,
  isWebPushSupported,
  PushSetupError,
  type PushSetupFailureReason,
} from '@/lib/push/client';

type PushState = 'idle' | 'active' | 'denied' | 'unsupported';

interface UsePushNotificationsResult {
  /** Current subscription state. */
  state: PushState;
  /** Current notification permission. */
  permission: NotificationPermission | 'unsupported';
  /** True while a subscribe/unsubscribe operation is in progress. */
  loading: boolean;
  /** Last setup error, if the latest push action failed before becoming active. */
  error: PushSetupFailureReason | null;
  /** Enable push notifications (requests permission if needed). */
  enable: () => Promise<void>;
  /** Disable push notifications. */
  disable: () => Promise<void>;
  /**
   * Schedule a local notification via the Service Worker (no server call).
   * Use this for rest-timer alerts — the SW fires the notification after delayMs.
   */
  scheduleLocal: (opts: { id: string; delayMs: number; title: string; body: string; tag?: string }) => void;
  /** Cancel a scheduled local notification by ID. */
  cancelLocal: (id: string) => void;
}

export function usePushNotifications(accessToken?: string): UsePushNotificationsResult {
  const [state, setState] = useState<PushState>('idle');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PushSetupFailureReason | null>(null);

  // Detect support + existing subscription on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isWebPushSupported()) {
      setState('unsupported');
      setPermission('unsupported');
      return;
    }
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);
    if (currentPermission === 'denied') {
      setState('denied');
      return;
    }
    let cancelled = false;
    isPushActive().then((active) => {
      if (cancelled) return;
      if (active) setState('active');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (state === 'unsupported' || loading) return;
    setLoading(true);
    setError(null);
    try {
      const sub = await subscribeToPush();
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);
      if (!sub) {
        setState(currentPermission === 'denied' ? 'denied' : 'idle');
        return;
      }
      try {
        await registerSubscription(sub, accessToken);
      } catch (err) {
        await sub.unsubscribe().catch((unsubscribeErr: unknown) => {
          console.error('[usePushNotifications] rollback unsubscribe failed', unsubscribeErr);
        });
        throw err;
      }
      setState('active');
    } catch (err) {
      console.error('[usePushNotifications] enable failed', err);
      const reason = err instanceof PushSetupError ? err.reason : 'subscription-failed';
      setError(reason);
      setPermission(getNotificationPermission());
      setState(
        reason === 'unsupported' || reason === 'missing-vapid-key' || reason === 'service-worker-unavailable'
          ? 'unsupported'
          : 'idle'
      );
    } finally {
      setLoading(false);
    }
  }, [state, loading, accessToken]);

  const disable = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await unsubscribeFromPush(accessToken);
      setPermission(getNotificationPermission());
      setState('idle');
    } catch (err) {
      console.error('[usePushNotifications] disable failed', err);
    } finally {
      setLoading(false);
    }
  }, [loading, accessToken]);

  const scheduleLocal = useCallback(
    ({ id, delayMs, title, body, tag }: { id: string; delayMs: number; title: string; body: string; tag?: string }) => {
      void scheduleLocalNotification({
        id,
        delayMs,
        title,
        body,
        tag,
      });
    },
    []
  );

  const cancelLocal = useCallback((id: string) => {
    void cancelLocalNotification(id);
  }, []);

  return { state, permission, loading, error, enable, disable, scheduleLocal, cancelLocal };
}
