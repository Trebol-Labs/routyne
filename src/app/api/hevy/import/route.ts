import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchWorkoutsPage, HevyApiError } from '@/lib/hevy/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EMAIL = 'npadilla133@gmail.com';

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
    return NextResponse.json({
      page: pageData.page,
      pageCount: pageData.page_count,
      workouts: pageData.workouts,
    });
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
