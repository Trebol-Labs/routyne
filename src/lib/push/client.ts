/**
 * Client-side Web Push utilities.
 *
 * Usage:
 *   const sub = await subscribeToPush();
 *   if (sub) await registerSubscription(sub);
 */

const SERVICE_WORKER_READY_TIMEOUT_MS = 2500;
const SERVICE_WORKER_DISCOVERY_TIMEOUT_MS = 750;
const NOTIFICATION_PERMISSION_TIMEOUT_MS = 15000;

export type PushSetupFailureReason =
  | 'unsupported'
  | 'missing-vapid-key'
  | 'service-worker-unavailable'
  | 'subscription-failed'
  | 'server-rejected';

export class PushSetupError extends Error {
  constructor(
    public readonly reason: PushSetupFailureReason,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'PushSetupError';
  }
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/** Convert base64url VAPID public key to Uint8Array for PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function waitForReadyServiceWorker(timeoutMs: number): Promise<ServiceWorkerRegistration | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) return registration;

    return await waitForReadyServiceWorker(
      registration ? SERVICE_WORKER_READY_TIMEOUT_MS : SERVICE_WORKER_DISCOVERY_TIMEOUT_MS
    );
  } catch {
    return null;
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (Notification.permission !== 'default') return Notification.permission;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Notification.requestPermission(),
      new Promise<NotificationPermission>((resolve) => {
        timeoutId = setTimeout(() => resolve(Notification.permission), NOTIFICATION_PERMISSION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function readErrorBody(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string') {
      return (body as { error: string }).error;
    }
  } catch {
    return null;
  }
  return null;
}

/** Request notification permission + create a push subscription.
 *  Returns null if permission is denied or push is unsupported. */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) {
    throw new PushSetupError('unsupported', 'This browser does not support Web Push.');
  }
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
    throw new PushSetupError('missing-vapid-key', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.');
  }

  const reg = await getReadyServiceWorkerRegistration();
  if (!reg) {
    throw new PushSetupError('service-worker-unavailable', 'No active service worker is available for Web Push.');
  }

  const permission = await requestBrowserNotificationPermission();
  if (permission !== 'granted') return null;

  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // PushManager accepts ArrayBuffer or ArrayBufferView; pass the buffer directly.
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });
  } catch (err) {
    console.error('[Push] subscribe failed', err);
    throw new PushSetupError('subscription-failed', 'The browser could not create a push subscription.', err);
  }
}

/** Send the push subscription to our server for storage. */
export async function registerSubscription(sub: PushSubscription, accessToken?: string): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(sub.toJSON()),
  });

  if (!response.ok) {
    const detail = await readErrorBody(response);
    const suffix = detail ? `: ${detail}` : '';
    throw new PushSetupError(
      'server-rejected',
      `The server rejected the push subscription (${response.status})${suffix}.`
    );
  }
}

/** Remove the push subscription from our server and unsubscribe locally. */
export async function unsubscribeFromPush(accessToken?: string): Promise<void> {
  if (!isWebPushSupported()) return;

  try {
    const reg = await getReadyServiceWorkerRegistration();
    if (!reg) return;

    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      if (!response.ok) {
        console.warn('[Push] server unsubscribe failed', response.status);
      }
    } finally {
      await sub.unsubscribe();
    }

  } catch (err) {
    console.error('[Push] unsubscribe failed', err);
  }
}

/** Check if push notifications are active (permission granted + subscription exists). */
export async function isPushActive(): Promise<boolean> {
  if (!isWebPushSupported() || Notification.permission !== 'granted') return false;

  try {
    const reg = await getReadyServiceWorkerRegistration();
    if (!reg) return false;

    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}

interface LocalNotificationPayload {
  id: string;
  delayMs: number;
  title: string;
  body: string;
  tag?: string;
  data?: {
    kind?: string;
    url?: string;
    [key: string]: unknown;
  };
}

async function postToServiceWorker(message: Record<string, unknown>): Promise<void> {
  if (!isWebPushSupported()) return;

  const registration = await getReadyServiceWorkerRegistration();
  if (!registration) return;

  if (registration.active) {
    registration.active.postMessage(message);
  }
}

export async function scheduleLocalNotification(opts: LocalNotificationPayload): Promise<void> {
  await postToServiceWorker({
    type: 'SCHEDULE_NOTIFICATION',
    ...opts,
  });
}

export async function cancelLocalNotification(id: string): Promise<void> {
  await postToServiceWorker({
    type: 'CANCEL_SCHEDULED_NOTIFICATION',
    id,
  });
}
