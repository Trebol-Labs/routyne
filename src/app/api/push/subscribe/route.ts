/**
 * POST /api/push/subscribe — store a PushSubscription
 * DELETE /api/push/subscribe — remove a PushSubscription
 *
 * Production uses Supabase-backed storage keyed by user_id + endpoint.
 * Local/dev falls back to an in-memory map when Supabase is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { subscriptions } from '@/lib/push/subscriptions';
import {
  deletePushSubscriptionRow,
  getUserIdFromBearerToken,
  upsertPushSubscriptionRow,
} from '@/lib/push/server';

function supabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function parseSubscriptionBody(body: unknown): { endpoint: string; keys?: { p256dh: string; auth: string } } | null {
  if (typeof body !== 'object' || body === null) return null;
  const candidate = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof candidate.endpoint !== 'string') return null;
  const keys = candidate.keys;
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
    return { endpoint: candidate.endpoint };
  }

  return {
    endpoint: candidate.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = parseSubscriptionBody(body);
  if (!parsed?.endpoint || !parsed.keys?.p256dh || !parsed.keys?.auth) {
    return NextResponse.json({ error: 'Missing endpoint or keys' }, { status: 400 });
  }

  if (supabaseConfigured()) {
    const userId = await getUserIdFromBearerToken(req.headers.get('authorization'));
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await upsertPushSubscriptionRow(userId, {
      user_id: userId,
      endpoint: parsed.endpoint,
      keys: parsed.keys,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  subscriptions.set(parsed.endpoint, {
    endpoint: parsed.endpoint,
    keys: parsed.keys,
    addedAt: Date.now(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const endpoint = typeof body === 'object' && body !== null && typeof (body as { endpoint?: unknown }).endpoint === 'string'
    ? (body as { endpoint: string }).endpoint
    : null;

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  if (supabaseConfigured()) {
    const userId = await getUserIdFromBearerToken(req.headers.get('authorization'));
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deletePushSubscriptionRow(userId, endpoint);
    return NextResponse.json({ ok: true });
  }

  subscriptions.delete(endpoint);
  return NextResponse.json({ ok: true });
}

