import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt } from '@/lib/coach/prompts';
import type { UserCoachContext } from '@/lib/coach/context-builder';

// ── In-memory rate limiter (resets on cold start — good enough for Hobby tier) ─

const LIMIT = parseInt(process.env.COACH_DAILY_LIMIT_FREE ?? '5', 10);

interface RateBucket { count: number; resetAt: number; }
const buckets = new Map<string, RateBucket>();

function getRateLimitKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + 86_400_000 });
    return { allowed: true, remaining: LIMIT - 1 };
  }
  if (bucket.count >= LIMIT) return { allowed: false, remaining: 0 };
  bucket.count++;
  return { allowed: true, remaining: LIMIT - bucket.count };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Requires AI Gateway OIDC auth. Run `vercel env pull` locally to get VERCEL_OIDC_TOKEN (~24h).
  // On Vercel deployments the token is auto-refreshed — no manual key rotation needed.
  if (!process.env.VERCEL_OIDC_TOKEN) {
    return NextResponse.json({ error: 'Coach not configured' }, { status: 503 });
  }

  const key = getRateLimitKey(req);
  const { allowed, remaining } = checkRateLimit(key);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Límite diario alcanzado. Vuelve mañana.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    );
  }

  let messages: { role: 'user' | 'assistant'; content: string }[];
  let userContext: UserCoachContext;
  try {
    const body = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      userContext: UserCoachContext;
    };
    messages = body.messages;
    userContext = body.userContext;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!messages?.length) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: 'anthropic/claude-haiku-4.5', // routes through Vercel AI Gateway
      maxOutputTokens: 512,
      system: buildSystemPrompt(userContext),
      messages,
    });

    return NextResponse.json(
      { reply: text },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  } catch (err) {
    console.error('[/api/coach] generateText error', err);
    return NextResponse.json(
      { error: 'Error al conectar con el AI. Inténtalo de nuevo.' },
      { status: 502 }
    );
  }
}
