import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromBearerToken } from '@/lib/push/server';
import {
  deleteNotificationDeviceRow,
  upsertNotificationDeviceRow,
} from '@/lib/notifications/server';

function supabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function parseRegisterBody(body: unknown): {
  deviceId: string;
  token: string;
  platform: 'ios' | 'android';
  provider: 'fcm';
  appId: string;
} | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const candidate = body as {
    deviceId?: unknown;
    token?: unknown;
    platform?: unknown;
    provider?: unknown;
    appId?: unknown;
  };

  if (
    typeof candidate.deviceId !== 'string' ||
    typeof candidate.token !== 'string' ||
    (candidate.platform !== 'ios' && candidate.platform !== 'android') ||
    typeof candidate.appId !== 'string'
  ) {
    return null;
  }

  return {
    deviceId: candidate.deviceId,
    token: candidate.token,
    platform: candidate.platform,
    provider: candidate.provider === 'fcm' ? 'fcm' : 'fcm',
    appId: candidate.appId,
  };
}

function parseDeleteBody(body: unknown): { deviceId: string } | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const candidate = body as { deviceId?: unknown };
  if (typeof candidate.deviceId !== 'string') {
    return null;
  }

  return { deviceId: candidate.deviceId };
}

export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = parseRegisterBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Missing deviceId, token, platform, or appId' }, { status: 400 });
  }

  const userId = await getUserIdFromBearerToken(req.headers.get('authorization'));
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await upsertNotificationDeviceRow(userId, {
    device_id: parsed.deviceId,
    user_id: userId,
    token: parsed.token,
    platform: parsed.platform,
    provider: parsed.provider,
    app_id: parsed.appId,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = parseDeleteBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
  }

  const userId = await getUserIdFromBearerToken(req.headers.get('authorization'));
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteNotificationDeviceRow(userId, parsed.deviceId);
  return NextResponse.json({ ok: true });
}
