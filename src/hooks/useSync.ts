'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { pushToCloud, pullFromCloud } from '@/lib/sync/syncEngine';
import { getPendingCount } from '@/lib/sync/queue';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export function useSync(): { status: SyncStatus; pendingCount: number; syncNow: () => void } {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncing = useRef(false);

  const sync = async (userId: string) => {
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
  };

  // Sync on auth change (user just logged in)
  useEffect(() => {
    if (!user) { setStatus('idle'); return; }
    sync(user.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Sync when tab returns to foreground
  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (!document.hidden) sync(user.id);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
