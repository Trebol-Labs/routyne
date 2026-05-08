'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { useRouter } from 'next/navigation';
import { isNativeCapacitorRuntime, mapNativeAuthUrlToHostedUrl, SITE_URL } from '@/lib/site';

function extractUrl(payload: unknown): string | null {
  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const candidate = payload as {
    url?: unknown;
    data?: unknown;
    extra?: unknown;
    notification?: { data?: unknown; extra?: unknown };
  };

  if (typeof candidate.url === 'string') {
    return candidate.url;
  }

  if (typeof candidate.data === 'string') {
    return candidate.data;
  }

  if (typeof candidate.extra === 'string') {
    return candidate.extra;
  }

  if (typeof candidate.notification?.data === 'string') {
    return candidate.notification.data;
  }

  if (typeof candidate.notification?.extra === 'string') {
    return candidate.notification.extra;
  }

  return null;
}

function navigateToUrl(router: ReturnType<typeof useRouter>, rawUrl: string): void {
  const hostedAuthUrl = mapNativeAuthUrlToHostedUrl(rawUrl);
  if (hostedAuthUrl) {
    window.location.replace(hostedAuthUrl);
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl, SITE_URL);
  } catch {
    return;
  }

  const isSameOrigin = parsed.origin === SITE_URL || parsed.origin === window.location.origin;
  if (!isSameOrigin) {
    window.location.assign(parsed.toString());
    return;
  }

  if (parsed.pathname === '/auth/callback') {
    window.location.replace(parsed.toString());
    return;
  }

  router.replace(`${parsed.pathname}${parsed.search}${parsed.hash}`);
}

export function useNativeDeepLinks(): void {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeCapacitorRuntime()) {
      return;
    }

    let cancelled = false;
    const handleUrl = (url: string) => {
      if (cancelled) return;
      navigateToUrl(router, url);
    };

    const launchUrlPromise = App.getLaunchUrl().then((launchUrl) => {
      if (!cancelled && launchUrl?.url) {
        handleUrl(launchUrl.url);
      }
    }).catch((error) => {
      console.error('[useNativeDeepLinks] launch url read failed', error);
    });

    const appUrlListenerPromise = App.addListener('appUrlOpen', (event) => {
      if (event.url) {
        handleUrl(event.url);
      }
    });

    const pushListenerPromise = PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const payload = event.notification as { data?: unknown; extra?: unknown };
      const url = extractUrl(payload.data) ?? extractUrl(payload.extra);
      if (url) {
        handleUrl(url);
      }
    });

    const localListenerPromise = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const payload = event.notification as { data?: unknown; extra?: unknown };
      const url = extractUrl(payload.data) ?? extractUrl(payload.extra);
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      cancelled = true;
      void launchUrlPromise;
      void appUrlListenerPromise.then((handle) => Promise.resolve(handle.remove()).catch(() => {})).catch(() => {});
      void pushListenerPromise.then((handle) => Promise.resolve(handle.remove()).catch(() => {})).catch(() => {});
      void localListenerPromise.then((handle) => Promise.resolve(handle.remove()).catch(() => {})).catch(() => {});
    };
  }, [router]);
}
