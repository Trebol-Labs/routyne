/**
 * Client-side Web Push utilities.
 *
 * Usage:
 *   const sub = await subscribeToPush();
 *   if (sub) await registerSubscription(sub);
 */

/** Convert base64url VAPID public key to Uint8Array for PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Request notification permission + create a push subscription.
 *  Returns null if permission is denied or push is unsupported. */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // PushManager accepts ArrayBuffer or ArrayBufferView; pass the buffer directly.
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });
  } catch (err) {
    console.error('[Push] subscribe failed', err);
    return null;
  }
}

/** Send the push subscription to our server for storage. */
export async function registerSubscription(sub: PushSubscription, accessToken?: string): Promise<void> {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(sub.toJSON()),
  });
}

/** Remove the push subscription from our server and unsubscribe locally. */
export async function unsubscribeFromPush(accessToken?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });

    await sub.unsubscribe();
  } catch (err) {
    console.error('[Push] unsubscribe failed', err);
  }
}

/** Check if push notifications are active (permission granted + subscription exists). */
export async function isPushActive(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return false;

  try {
    const reg = await navigator.serviceWorker.ready;
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
}

async function postToServiceWorker(message: Record<string, unknown>): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
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
