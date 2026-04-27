'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { pushToCloud, pullFromCloud } from '@/lib/sync/syncEngine';
import { getPendingCount } from '@/lib/sync/queue';
import { loadMetaValue, saveMetaValue } from '@/lib/db/meta';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface UseSyncResult {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  syncNow: () => void;
}

const LAST_SYNC_KEY_PREFIX = 'last-sync-at:';

export function useSync(userId?: string): UseSyncResult {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const isSyncing = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const sync = useCallback(async (currentUserId: string) => {
    if (isSyncing.current) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline');
      setLastError('Sin conexión');
      return;
    }

    isSyncing.current = true;
    setStatus('syncing');
    setLastError(null);

    try {
      await pushToCloud(currentUserId);
      await pullFromCloud(currentUserId);
      const now = new Date().toISOString();
      setLastSyncAt(now);
      setStatus('synced');
      await saveMetaValue(`${LAST_SYNC_KEY_PREFIX}${currentUserId}`, now);
      await refreshPendingCount();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo sincronizar';
      setLastError(message);
      setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
    } finally {
      isSyncing.current = false;
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    if (!userId) {
      setStatus('idle');
      setLastError(null);
      setLastSyncAt(null);
      return;
    }

    void (async () => {
      const savedLastSync = await loadMetaValue(`${LAST_SYNC_KEY_PREFIX}${userId}`);
      setLastSyncAt(savedLastSync);
      await sync(userId);
    })();
  }, [sync, userId]);

  useEffect(() => {
    if (!userId) return;

    const handleVisibility = () => {
      if (!document.hidden) {
        void sync(userId);
      }
    };

    const handleOnline = () => {
      void sync(userId);
    };

    const handleOffline = () => {
      setStatus('offline');
      setLastError('Sin conexión');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync, userId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshPendingCount();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [refreshPendingCount]);

  return {
    status,
    pendingCount,
    lastSyncAt,
    lastError,
    syncNow: () => {
      if (userId) {
        void sync(userId);
      }
    },
  };
}
