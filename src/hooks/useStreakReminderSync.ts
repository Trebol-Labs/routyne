'use client';

import { useEffect, useRef } from 'react';
import { syncStreakReminderNotifications } from '@/lib/notifications/provider';
import type { HistoryEntry, UserProfile } from '@/types/workout';

interface UseStreakReminderSyncInput {
  isReady: boolean;
  profile: UserProfile;
  history: HistoryEntry[];
}

function buildReminderSyncSignature(profile: UserProfile, history: HistoryEntry[]): string {
  const historySignature = history
    .slice(0, 90)
    .map((entry) => `${entry.id}:${entry.completedAt instanceof Date ? entry.completedAt.toISOString() : new Date(entry.completedAt).toISOString()}`)
    .join('|');

  return [
    profile.displayName,
    [...profile.restDays].sort((a, b) => a - b).join(','),
    profile.preferences.language,
    profile.preferences.timezone,
    profile.preferences.streakReminderEnabled ? '1' : '0',
    profile.preferences.streakReminderTime,
    historySignature,
  ].join('::');
}

export function useStreakReminderSync({ isReady, profile, history }: UseStreakReminderSyncInput): void {
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const signature = buildReminderSyncSignature(profile, history);
    if (lastSignature.current === signature) {
      return;
    }

    lastSignature.current = signature;
    void syncStreakReminderNotifications({
      profile: {
        displayName: profile.displayName,
        restDays: profile.restDays,
        preferences: profile.preferences,
      },
      history: history.map((entry) => ({ completedAt: entry.completedAt })),
    }).catch((error) => {
      console.error('[useStreakReminderSync] sync failed', error);
    });
  }, [history, isReady, profile]);
}
