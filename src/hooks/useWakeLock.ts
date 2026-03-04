'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
  onrelease: ((this: WakeLockSentinel, ev: Event) => unknown) | null;
  addEventListener(type: 'release', listener: (this: WakeLockSentinel, ev: Event) => unknown, options?: boolean | AddEventListenerOptions): void;
}

/**
 * Custom hook to manage the Screen Wake Lock API.
 * Keeps the screen active during workout sessions.
 */
export function useWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const requestWakeLock = useCallback(async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        const nav = navigator as unknown as { wakeLock: { request(type: 'screen'): Promise<WakeLockSentinel> } };
        const sentinel = await nav.wakeLock.request('screen');
        wakeLockRef.current = sentinel;

        sentinel.addEventListener('release', () => {
          wakeLockRef.current = null;
          queueMicrotask(() => setIsLocked(false));
        });
        queueMicrotask(() => setIsLocked(true));
      } catch (err: unknown) {
        // Silent fail to avoid breaking the app on unsupported browsers
        if (err instanceof Error) {
          console.warn(`Wake Lock request failed: ${err.message}`);
        }
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        queueMicrotask(() => setIsLocked(false));
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.warn(`Wake Lock release failed: ${err.message}`);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      void requestWakeLock();
    } else {
      void releaseWakeLock();
    }

    const handleVisibilityChange = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [isActive, requestWakeLock, releaseWakeLock]);

  return { requestWakeLock, releaseWakeLock, isLocked };
}
