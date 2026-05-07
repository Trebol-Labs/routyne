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
}

interface ScheduleMessage {
  type: 'SCHEDULE_NOTIFICATION';
  id: string;
  delayMs: number;
  title: string;
  body: string;
  tag?: string;
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

  const { id, delayMs, title, body, tag } = data;
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
      data: { url: payload.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url: string = (event.notification.data as { url?: string }).url ?? '/';

  event.waitUntil(
    (self.clients as Clients)
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('navigate' in client && 'focus' in client) {
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
