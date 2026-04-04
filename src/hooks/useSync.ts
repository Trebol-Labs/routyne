'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { pushToCloud, pullFromCloud } from '@/lib/sync/syncEngine';
import { getPendingCount } from '@/lib/sync/queue';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export function useSync(): { status: SyncStatus; pendingCount: number; syncNow: () => void } {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncing = useRef(false);

  const sync = useCallback(async (userId: string) => {
    if (isSyncing.current) return;
    if (!navigator.onLine) { setStatus('offline'); return; }

    isSyncing.current = true;
    setStatus('syncing');
    try {
      await pushToCloud(userId);
      await pullFromCloud(userId);
      const remaining = await getPendingCount();
      setPendingCount(remaining);
      setStatus('synced');
    } catch {
      setStatus('error');
    } finally {
      isSyncing.current = false;
    }
  // isSyncing is a ref (stable); setters, pushToCloud, pullFromCloud, getPendingCount are all stable
  }, []);

  const userId = user?.id;

  // Sync on auth change (user just logged in)
  useEffect(() => {
    if (!userId) { setStatus('idle'); return; }
    sync(userId);
  }, [userId, sync]);

  // Sync when tab returns to foreground
  useEffect(() => {
    if (!userId) return;
    const handleVisibility = () => {
      if (!document.hidden) sync(userId);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [userId, sync]);

  // Poll pending count every 30s (shows badge in UI without full sync)
  useEffect(() => {
    const id = setInterval(async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return {
    status,
    pendingCount,
    syncNow: () => user && sync(user.id),
  };
}
