'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  subscribeToPush,
  registerSubscription,
  unsubscribeFromPush,
  isPushActive,
  scheduleLocalNotification,
  cancelLocalNotification,
} from '@/lib/push/client';

type PushState = 'idle' | 'active' | 'denied' | 'unsupported';

interface UsePushNotificationsResult {
  /** Current subscription state. */
  state: PushState;
  /** Current notification permission. */
  permission: NotificationPermission | 'unsupported';
  /** True while a subscribe/unsubscribe operation is in progress. */
  loading: boolean;
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

  // Detect support + existing subscription on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    isPushActive().then((active) => {
      if (active) setState('active');
    });
  }, []);

  const enable = useCallback(async () => {
    if (state === 'unsupported' || loading) return;
    setLoading(true);
    try {
      const sub = await subscribeToPush();
      setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
      if (!sub) {
        setState(Notification.permission === 'denied' ? 'denied' : 'idle');
        return;
      }
      await registerSubscription(sub, accessToken);
      setState('active');
    } catch (err) {
      console.error('[usePushNotifications] enable failed', err);
    } finally {
      setLoading(false);
    }
  }, [state, loading, accessToken]);

  const disable = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await unsubscribeFromPush(accessToken);
      setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
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

  return { state, permission, loading, enable, disable, scheduleLocal, cancelLocal };
}
