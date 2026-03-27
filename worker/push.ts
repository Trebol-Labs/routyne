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
  delayMs: number;
  title: string;
  body: string;
  tag?: string;
}

// ── Scheduled notifications (rest-timer alerts, no server round-trip) ─────────
// Client calls: navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE_NOTIFICATION', delayMs, title, body })

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as ScheduleMessage | undefined;
  if (!data || data.type !== 'SCHEDULE_NOTIFICATION') return;

  const { delayMs, title, body, tag } = data;
  setTimeout(() => {
    self.registration.showNotification(title, {
      body,
      tag: tag ?? 'routyne-timer',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
    });
  }, delayMs);
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
