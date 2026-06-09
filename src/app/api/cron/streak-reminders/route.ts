import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { buildStreakReminderCopy, getCurrentStreak, getLocalDateKey, shouldSendStreakReminder } from '@/lib/notifications/reminders';
import {
  deletePushSubscriptionRow,
  loadAllPushSubscriptionRows,
  markPushSubscriptionSent,
} from '@/lib/push/server';
import type { Database } from '@/lib/supabase/client';
import type { AppLanguage } from '@/types/workout';

import { timingSafeCompare } from '@/lib/auth';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';

function assertCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  return timingSafeCompare(authHeader, `Bearer ${process.env.CRON_SECRET}`);
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase not configured');
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || !assertCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const sb = createServiceClient();
  const [profilesResult, historyResult, subscriptionsResult] = await Promise.all([
    sb.from('profiles').select('user_id, display_name, rest_days, preferences'),
    sb.from('history').select('user_id, completed_at').order('completed_at', { ascending: false }),
    loadAllPushSubscriptionRows(),
  ]);

  if (profilesResult.error) {
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
  }
  if (historyResult.error) {
    return NextResponse.json({ error: historyResult.error.message }, { status: 500 });
  }

  const now = new Date();
  const historiesByUser = new Map<string, Array<{ completedAt: Date }>>();
  for (const row of historyResult.data ?? []) {
    const userId = (row as { user_id: string }).user_id;
    const completedAt = new Date((row as { completed_at: string }).completed_at);
    const list = historiesByUser.get(userId) ?? [];
    list.push({ completedAt });
    historiesByUser.set(userId, list);
  }

  const subscriptionsByUser = new Map<string, Array<(typeof subscriptionsResult)[number]>>();
  for (const row of subscriptionsResult) {
    const list = subscriptionsByUser.get(row.user_id) ?? [];
    list.push(row);
    subscriptionsByUser.set(row.user_id, list);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  interface NotificationTarget {
    profile: {
      user_id: string;
      display_name: string | null;
      rest_days: number[] | null;
      preferences: Record<string, unknown> | null;
    };
    subscription: (typeof subscriptionsResult)[number];
    reminderCopy: ReturnType<typeof buildStreakReminderCopy>;
  }

  const targets: NotificationTarget[] = [];

  for (const profileRow of profilesResult.data ?? []) {
    const profile = profileRow as {
      user_id: string;
      display_name: string | null;
      rest_days: number[] | null;
      preferences: Record<string, unknown> | null;
    };

    const timezone = typeof profile.preferences?.timezone === 'string' && profile.preferences.timezone
      ? profile.preferences.timezone
      : 'America/Bogota';
    const language = profile.preferences?.language === 'en' ? 'en' : 'es';
    if (profile.preferences?.streakReminderEnabled === false) {
      skipped++;
      continue;
    }
    const restDays = profile.rest_days ?? [];
    const historyForUser = historiesByUser.get(profile.user_id) ?? [];
    const currentStreak = getCurrentStreak({
      history: historyForUser,
      restDays,
      timezone,
      now,
    });
    const reminderCopy = buildStreakReminderCopy({
      displayName: profile.display_name,
      currentStreak,
      language: language as AppLanguage,
    });

    if (!shouldSendStreakReminder({
      history: historyForUser,
      restDays,
      timezone,
      now,
    })) {
      skipped++;
      continue;
    }

    const localTodayKey = getLocalDateKey(now, timezone);
    const subscriptionsForUser = subscriptionsByUser.get(profile.user_id) ?? [];
    for (const subscription of subscriptionsForUser) {
      if (subscription.last_sent_at && getLocalDateKey(new Date(subscription.last_sent_at), timezone) === localTodayKey) {
        skipped++;
        continue;
      }
      targets.push({
        profile,
        subscription,
        reminderCopy,
      });
    }
  }

  const sendPromises = targets.map(async ({ profile, subscription, reminderCopy }) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify({
          title: reminderCopy.title,
          body: reminderCopy.body,
          tag: 'routyne-streak',
          url: '/',
          data: {
            kind: 'streak-reminder',
            url: '/',
          },
        })
      );
      await markPushSubscriptionSent(profile.user_id, subscription.endpoint);
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await deletePushSubscriptionRow(profile.user_id, subscription.endpoint).catch(() => {});
      } else {
        failed++;
        console.error('[/api/cron/streak-reminders] send failed', err);
      }
    }
  });

  await Promise.allSettled(sendPromises);

  return NextResponse.json({ ok: true, sent, skipped, failed });
}
