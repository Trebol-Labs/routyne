/**
 * POST /api/push/notify — send a Web Push notification to all stored subscriptions.
 *
 * Production reads subscriptions from Supabase. Local/dev falls back to the
 * in-memory subscription map used by Hobby-tier testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { subscriptions } from '@/lib/push/subscriptions';
import {
  loadAllPushSubscriptionRows,
  markPushSubscriptionSent,
} from '@/lib/push/server';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  data?: {
    kind?: string;
    url?: string;
    [key: string]: unknown;
  };
}

function vapidConfigured(): boolean {
  return !!(VAPID_PUBLIC && VAPID_PRIVATE);
}

function isAuthorized(request: NextRequest): boolean {
  if (!process.env.CRON_SECRET) {
    return process.env.NODE_ENV !== 'production';
  }

  return request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

async function getTargets(): Promise<Array<{ userId?: string; endpoint: string; keys: { p256dh: string; auth: string } }>> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const rows = await loadAllPushSubscriptionRows();
    return rows.map((row) => ({
      userId: row.user_id,
      endpoint: row.endpoint,
      keys: row.keys,
    }));
  }

  return Array.from(subscriptions.values()).map((row) => ({
    endpoint: row.endpoint,
    keys: row.keys,
  }));
}

export async function POST(req: NextRequest) {
  if (!vapidConfigured()) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PushPayload;
  try {
    body = await req.json() as PushPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.title || !body.body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const payload = JSON.stringify({
    title: body.title,
    body: body.body,
    tag: body.tag ?? 'routyne',
    url: body.url ?? '/',
    silent: false,
    renotify: true,
    vibrate: [120, 60, 120],
    data: {
      kind: body.data?.kind ?? 'push',
      url: body.data?.url ?? body.url ?? '/',
      ...(body.data ?? {}),
    },
  });

  const targets = await getTargets();
  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const target of targets) {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: target.keys },
        payload
      );
      sent++;
      if (target.userId) {
        await markPushSubscriptionSent(target.userId, target.endpoint);
      }
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if ((status === 404 || status === 410) && target.userId) {
        removed++;
        try {
          const { deletePushSubscriptionRow } = await import('@/lib/push/server');
          await deletePushSubscriptionRow(target.userId, target.endpoint);
        } catch (deleteErr) {
          console.error('[/api/push/notify] stale subscription cleanup failed', deleteErr);
        }
      } else {
        console.error('[/api/push/notify] send error', status, target.endpoint);
        failed++;
      }
    }
  }

  return NextResponse.json({ sent, failed, removed });
}
