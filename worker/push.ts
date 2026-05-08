/**
 * Service worker push event handlers.
 * This file is bundled by @ducanh2912/next-pwa and injected via importScripts
 * into the generated service worker (public/sw.js).
 */

declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  data?: {
    kind?: string;
    url?: string;
    [key: string]: unknown;
  };
}

interface ScheduleMessage {
  type: 'SCHEDULE_NOTIFICATION';
  id: string;
  delayMs: number;
  title: string;
  body: string;
  tag?: string;
  data?: PushPayload['data'];
}

interface CancelMessage {
  type: 'CANCEL_SCHEDULED_NOTIFICATION';
  id: string;
}

const scheduledNotifications = new Map<string, ReturnType<typeof setTimeout>>();

// ── Scheduled notifications (rest-timer alerts, no server round-trip) ─────────
// Client calls: navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE_NOTIFICATION', delayMs, title, body })

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as ScheduleMessage | CancelMessage | undefined;
  if (!data) return;

  if (data.type === 'CANCEL_SCHEDULED_NOTIFICATION') {
    const timer = scheduledNotifications.get(data.id);
    if (timer) {
      clearTimeout(timer);
      scheduledNotifications.delete(data.id);
    }
    return;
  }

  const { id, delayMs, title, body, tag, data: payloadData } = data;
  const existing = scheduledNotifications.get(id);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    scheduledNotifications.delete(id);
    self.registration.showNotification(title, {
      body,
      tag: tag ?? 'routyne-timer',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      silent: false,
      renotify: true,
      vibrate: [120, 60, 120],
      data: {
        kind: payloadData?.kind ?? 'rest-timer',
        url: payloadData?.url ?? '/',
        ...(payloadData ?? {}),
      },
    });
  }, delayMs);
  scheduledNotifications.set(id, timer);
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'Routyne', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag ?? 'routyne',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      silent: false,
      renotify: true,
      vibrate: [120, 60, 120],
      data: {
        kind: payload.data?.kind ?? 'push',
        url: payload.data?.url ?? payload.url ?? '/',
        ...(payload.data ?? {}),
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data as { url?: string } | undefined;
  const url: string = payload?.url ?? '/';

  event.waitUntil(
    (self.clients as Clients)
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('navigate' in client && url) {
            return (client as WindowClient)
              .navigate(url)
              .then((navigatedClient) => navigatedClient.focus());
          }
          if ('focus' in client) {
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
