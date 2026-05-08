'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  cancelLocalNotification,
  disableNotifications,
  enableNotifications,
  getNotificationMode,
  getNotificationPermission,
  isNotificationsActive,
  scheduleLocalNotification,
  testNotification,
  type LocalNotificationRequest,
  type NotificationMode,
} from '@/lib/notifications/provider';
import { PushSetupError } from '@/lib/push/client';

type PushState = 'idle' | 'active' | 'denied' | 'unsupported';

export interface UsePushNotificationsResult {
  /** Current notification mode. */
  mode: NotificationMode;
  /** Current subscription state. */
  state: PushState;
  /** Current notification permission. */
  permission: NotificationPermission | 'unsupported';
  /** True while a subscribe/unsubscribe operation is in progress. */
  loading: boolean;
  /** Last setup error, if the latest push action failed before becoming active. */
  error: string | null;
  /** Enable push notifications (requests permission if needed). */
  enable: () => Promise<void>;
  /** Disable push notifications. */
  disable: () => Promise<void>;
  /** Schedule a local notification on the active platform. */
  scheduleLocal: (opts: LocalNotificationRequest) => void;
  /** Cancel a scheduled local notification by ID. */
  cancelLocal: (id: string) => void;
  /** Show a test notification immediately. */
  testNotification: (opts: { title: string; body: string; kind?: string; url?: string }) => Promise<void>;
}

function mapErrorToCode(error: unknown): string {
  if (error instanceof PushSetupError) {
    return error.reason;
  }

  if (error instanceof Error) {
    if (error.message.includes('Native device registration failed')) {
      return 'native-registration-failed';
    }
    if (error.message.includes('Native device removal failed')) {
      return 'native-unregister-failed';
    }
    if (error.message.includes('Timed out waiting for push registration')) {
      return 'native-registration-failed';
    }
    if (error.message.includes('Push registration did not return a token')) {
      return 'native-registration-failed';
    }
  }

  return 'subscription-failed';
}

export function usePushNotifications(accessToken?: string): UsePushNotificationsResult {
  const [mode, setMode] = useState<NotificationMode>('unsupported');
  const [state, setState] = useState<PushState>('idle');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const nextMode = getNotificationMode();
    setMode(nextMode);

    const currentPermission = await getNotificationPermission();
    setPermission(currentPermission);

    if (currentPermission === 'unsupported' || nextMode === 'unsupported') {
      setState('unsupported');
      return;
    }

    if (currentPermission === 'denied') {
      setState('denied');
      return;
    }

    const active = await isNotificationsActive(accessToken);
    setState(active ? 'active' : 'idle');
  }, [accessToken]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await refreshState();
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshState]);

  const enable = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      await enableNotifications(accessToken);
      await refreshState();
    } catch (err) {
      console.error('[usePushNotifications] enable failed', err);
      setError(mapErrorToCode(err));
      await refreshState();
    } finally {
      setLoading(false);
    }
  }, [accessToken, loading, refreshState]);

  const disable = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      await disableNotifications(accessToken);
      await refreshState();
    } catch (err) {
      console.error('[usePushNotifications] disable failed', err);
      setError(mapErrorToCode(err));
    } finally {
      setLoading(false);
    }
  }, [accessToken, loading, refreshState]);

  const scheduleLocal = useCallback((opts: LocalNotificationRequest) => {
    void scheduleLocalNotification(opts);
  }, []);

  const cancelLocal = useCallback((id: string) => {
    void cancelLocalNotification(id);
  }, []);

  const showTestNotification = useCallback(async (opts: { title: string; body: string; kind?: string; url?: string }) => {
    await testNotification(opts);
  }, []);

  return {
    mode,
    state,
    permission,
    loading,
    error,
    enable,
    disable,
    scheduleLocal,
    cancelLocal,
    testNotification: showTestNotification,
  };
}
