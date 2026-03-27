'use client';

import { useEffect, useState, useCallback } from 'react';
import { subscribeToPush, registerSubscription, unsubscribeFromPush, isPushActive } from '@/lib/push/client';

type PushState = 'idle' | 'active' | 'denied' | 'unsupported';

interface UsePushNotificationsResult {
  /** Current subscription state. */
  state: PushState;
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
  scheduleLocal: (opts: { delayMs: number; title: string; body: string; tag?: string }) => void;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [state, setState] = useState<PushState>('idle');
  const [loading, setLoading] = useState(false);

  // Detect support + existing subscription on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
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
      if (!sub) {
        setState(Notification.permission === 'denied' ? 'denied' : 'idle');
        return;
      }
      await registerSubscription(sub);
      setState('active');
    } catch (err) {
      console.error('[usePushNotifications] enable failed', err);
    } finally {
      setLoading(false);
    }
  }, [state, loading]);

  const disable = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await unsubscribeFromPush();
      setState('idle');
    } catch (err) {
      console.error('[usePushNotifications] disable failed', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const scheduleLocal = useCallback(
    ({ delayMs, title, body, tag }: { delayMs: number; title: string; body: string; tag?: string }) => {
      if (typeof window === 'undefined') return;
      if (!navigator.serviceWorker.controller) return;
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        delayMs,
        title,
        body,
        tag,
      });
    },
    []
  );

  return { state, loading, enable, disable, scheduleLocal };
}
