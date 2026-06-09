'use client';

import { useEffect, useRef } from 'react';
import {
  syncMealReminderNotifications,
  syncWeightReminderNotifications,
} from '@/lib/notifications/provider';
import { getLocalDateKey } from '@/lib/notifications/reminders';
import { loadBodyweightByDate } from '@/lib/db/bodyweight';
import type { UserProfile } from '@/types/workout';

interface UseDailyRemindersSyncInput {
  isReady: boolean;
  profile: UserProfile;
}

function buildReminderSyncSignature(profile: UserProfile, todayKey: string): string {
  const prefs = profile.preferences;
  return [
    profile.displayName,
    prefs.language,
    prefs.timezone,
    prefs.weightReminderEnabled ? '1' : '0',
    prefs.weightReminderTime,
    prefs.mealRemindersEnabled ? '1' : '0',
    [...prefs.mealReminderTimes].sort().join(','),
    todayKey,
  ].join('::');
}

export function useDailyRemindersSync({ isReady, profile }: UseDailyRemindersSyncInput): void {
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const now = new Date();
    const todayKey = getLocalDateKey(now, profile.preferences.timezone);
    const signature = buildReminderSyncSignature(profile, todayKey);
    if (lastSignature.current === signature) {
      return;
    }

    lastSignature.current = signature;

    void (async () => {
      let weighedTodayDateKey: string | null = null;
      try {
        const todayEntry = await loadBodyweightByDate(todayKey);
        weighedTodayDateKey = todayEntry ? todayKey : null;
      } catch (error) {
        console.error('[useDailyRemindersSync] bodyweight lookup failed', error);
      }

      await Promise.all([
        syncWeightReminderNotifications({
          profile: {
            displayName: profile.displayName,
            preferences: profile.preferences,
          },
          weighedTodayDateKey,
          now,
        }),
        syncMealReminderNotifications({
          profile: {
            displayName: profile.displayName,
            preferences: profile.preferences,
          },
          now,
        }),
      ]).catch((error) => {
        console.error('[useDailyRemindersSync] sync failed', error);
      });
    })();
  }, [isReady, profile]);
}
