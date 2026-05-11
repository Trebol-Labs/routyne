import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  registerSubscription,
  subscribeToPush,
} from './client';

const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
const originalVapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function stubPushGlobals(
  permission: NotificationPermission = 'default',
  requestPermission = vi.fn<() => Promise<NotificationPermission>>().mockResolvedValue('granted')
) {
  class PushManagerStub {}

  vi.stubGlobal('PushManager', PushManagerStub);
  vi.stubGlobal('Notification', {
    permission,
    requestPermission,
  } as unknown as typeof Notification);

  return { requestPermission };
}

function stubServiceWorker(container: Partial<ServiceWorkerContainer>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
}

function createSubscription(): PushSubscription {
  return {
    endpoint: 'https://push.example/subscription',
    expirationTime: null,
    options: { userVisibleOnly: true },
    getKey: vi.fn(),
    toJSON: () => ({
      endpoint: 'https://push.example/subscription',
      keys: {
        p256dh: 'public-key',
        auth: 'auth-secret',
      },
    }),
    unsubscribe: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  } as unknown as PushSubscription;
}

function createRegistration(pushManager: Partial<PushManager>): ServiceWorkerRegistration {
  return {
    active: {
      postMessage: vi.fn(),
    },
    pushManager,
  } as unknown as ServiceWorkerRegistration;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();

  if (originalServiceWorkerDescriptor) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorkerDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  }

  if (originalVapidPublicKey === undefined) {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  } else {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalVapidPublicKey;
  }
});

describe('push client', () => {
  it('fails quickly when no service worker becomes ready', async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'AQIDBA';
    const { requestPermission } = stubPushGlobals();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const register = vi.fn<() => Promise<ServiceWorkerRegistration>>()
      .mockRejectedValue(new Error('sw missing'));

    stubServiceWorker({
      getRegistration: vi.fn<() => Promise<ServiceWorkerRegistration | undefined>>().mockResolvedValue(undefined),
      register,
      ready: new Promise<ServiceWorkerRegistration>(() => {}),
    });

    await expect(subscribeToPush()).rejects.toMatchObject({
      reason: 'service-worker-unavailable',
    });

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[Push] service worker registration failed',
      expect.any(Error)
    );
  });

  it('subscribes with an active service worker registration', async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'AQIDBA';
    const { requestPermission } = stubPushGlobals();
    const subscription = createSubscription();
    const pushManager = {
      getSubscription: vi.fn<() => Promise<PushSubscription | null>>().mockResolvedValue(null),
      subscribe: vi.fn<(options?: PushSubscriptionOptionsInit) => Promise<PushSubscription>>().mockResolvedValue(subscription),
    };
    const registration = createRegistration(pushManager);

    stubServiceWorker({
      getRegistration: vi.fn<() => Promise<ServiceWorkerRegistration | undefined>>().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    });

    await expect(subscribeToPush()).resolves.toBe(subscription);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({
      applicationServerKey: expect.any(ArrayBuffer),
      userVisibleOnly: true,
    }));
  });

  it('registers the service worker before subscribing when none is active', async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'AQIDBA';
    const { requestPermission } = stubPushGlobals();
    const subscription = createSubscription();
    const pushManager = {
      getSubscription: vi.fn<() => Promise<PushSubscription | null>>().mockResolvedValue(null),
      subscribe: vi.fn<(options?: PushSubscriptionOptionsInit) => Promise<PushSubscription>>().mockResolvedValue(subscription),
    };
    const registration = createRegistration(pushManager);
    const register = vi.fn<() => Promise<ServiceWorkerRegistration>>().mockResolvedValue(registration);

    stubServiceWorker({
      getRegistration: vi.fn<() => Promise<ServiceWorkerRegistration | undefined>>().mockResolvedValue(undefined),
      register,
      ready: Promise.resolve(registration),
    });

    await expect(subscribeToPush()).resolves.toBe(subscription);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({
      applicationServerKey: expect.any(ArrayBuffer),
      userVisibleOnly: true,
    }));
  });

  it('stops waiting when notification permission stays pending', async () => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'AQIDBA';
    stubPushGlobals('default', vi.fn<() => Promise<NotificationPermission>>(() => (
      new Promise<NotificationPermission>(() => {})
    )));
    const pushManager = {
      getSubscription: vi.fn<() => Promise<PushSubscription | null>>().mockResolvedValue(null),
      subscribe: vi.fn<(options?: PushSubscriptionOptionsInit) => Promise<PushSubscription>>(),
    };
    const registration = createRegistration(pushManager);

    stubServiceWorker({
      getRegistration: vi.fn<() => Promise<ServiceWorkerRegistration | undefined>>().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    });

    const result = expect(subscribeToPush()).resolves.toBeNull();

    await vi.advanceTimersByTimeAsync(15001);

    await result;
    expect(pushManager.getSubscription).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('throws when server registration fails', async () => {
    const subscription = createSubscription();
    const fetchMock = vi.fn(() => Promise.resolve(
      new Response(JSON.stringify({ error: 'Push not configured' }), { status: 503 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(registerSubscription(subscription)).rejects.toMatchObject({
      reason: 'server-rejected',
      message: expect.stringContaining('503'),
    });
  });
});
