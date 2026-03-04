'use client';

import { useEffect } from 'react';

/** Request persistent storage once on mount to prevent browser eviction of IndexedDB. */
export function useStoragePersist(): void {
  useEffect(() => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);
}
