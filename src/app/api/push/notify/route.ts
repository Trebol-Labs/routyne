/**
 * POST /api/push/notify — immediately send a Web Push notification.
 *
 * Body: { title: string; body: string; tag?: string }
 *
 * For delayed notifications (e.g. rest timers), use the client-side approach:
 * send a postMessage to the Service Worker with { type: 'SCHEDULE_NOTIFICATION',
 * delayMs, title, body } — the SW uses setTimeout locally without a server round-trip.
 * This avoids serverless function timeout limits for delays > 30s.
 */

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { subscriptions } from '../subscribe/route';

// ── VAPID setup ───────────────────────────────────────────────────────────────

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     ?? 'mailto:admin@example.com';

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!VAPID_PRIVATE_KEY_CONFIGURED()) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  let body: { title: string; body: string; tag?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.title || !body.body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const payload = JSON.stringify({
    title: body.title,
    body:  body.body,
    tag:   body.tag ?? 'routyne',
  });

  let sent = 0;
  let failed = 0;
  const stale: string[] = [];

  for (const sub of subscriptions.values()) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // Subscription expired — clean up
        stale.push(sub.endpoint);
      } else {
        console.error('[/api/push/notify] send error', status, sub.endpoint);
        failed++;
      }
    }
  }

  for (const endpoint of stale) subscriptions.delete(endpoint);

  return NextResponse.json({ sent, failed, removed: stale.length });
}

function VAPID_PRIVATE_KEY_CONFIGURED(): boolean {
  return !!(VAPID_PUBLIC && VAPID_PRIVATE);
}
