/**
 * POST /api/push/subscribe — store a PushSubscription
 * DELETE /api/push/subscribe — remove a PushSubscription
 *
 * For Hobby tier: subscriptions are stored in-memory (resets on cold start).
 * For production with Supabase: persist in a push_subscriptions table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { subscriptions } from '@/lib/push/subscriptions';

// ── In-memory store (Hobby tier, resets on cold start) ────────────────────────

// ── POST — subscribe ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  let body: { endpoint: string; keys?: { p256dh: string; auth: string } };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'Missing endpoint or keys' }, { status: 400 });
  }

  subscriptions.set(body.endpoint, {
    endpoint: body.endpoint,
    keys: body.keys,
    addedAt: Date.now(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

// ── DELETE — unsubscribe ──────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  let body: { endpoint: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  subscriptions.delete(body.endpoint);
  return NextResponse.json({ ok: true });
}
