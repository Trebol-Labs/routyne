import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchWorkoutsPage, HevyApiError } from '@/lib/hevy/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EMAIL = 'npadilla133@gmail.com';

// ── In-memory rate limiter ────────────────────────────────────────────────────

const LIMIT = parseInt(process.env.HEVY_IMPORT_RATE_LIMIT ?? '60', 10);
const WINDOW_MS = 60_000; // 1 minute window

interface RateBucket { count: number; resetAt: number; }
const buckets = new Map<string, RateBucket>();

function getRateLimitKey(req: Request): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1 };
  }
  if (bucket.count >= LIMIT) return { allowed: false, remaining: 0 };
  bucket.count++;
  return { allowed: true, remaining: LIMIT - bucket.count };
}

// ──────────────────────────────────────────────────────────────────────────────

async function getAuthorizedUser(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const sb = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function GET(req: Request) {
  const key = getRateLimitKey(req);
  const { allowed, remaining } = checkRateLimit(key);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    );
  }

  const user = await getAuthorizedUser(req.headers.get('authorization'));
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') | 0);
  const pageSize = Math.min(
    10,
    Math.max(1, Number(searchParams.get('pageSize') ?? '10') | 0)
  );

  try {
    const pageData = await fetchWorkoutsPage(page, pageSize);
    return NextResponse.json(
      {
        page: pageData.page,
        pageCount: pageData.page_count,
        workouts: pageData.workouts,
      },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  } catch (err) {
    if (err instanceof HevyApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status === 401 || err.status === 403 ? 502 : 500 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}
