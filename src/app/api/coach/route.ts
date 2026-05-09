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

// ── Hybrid model selection ───────────────────────────────────────────────────
//
// Q&A goes to Haiku 4.5 (cheap, fast).
// Routine generation goes to Sonnet 4.6 (better at multi-constraint reasoning).
// Both route through Vercel AI Gateway — no API keys to manage, OIDC auto-refreshes.

const ROUTINE_INTENT_RE = /\b(rutina|routine|programa|workout\s*(plan|program)|split|periodi(z|s)aci[oó]n|hazme|cr[eé]ame?|cr[eé]a\s+(una|un|me)|gener(a|ame)|dise[ñn]a|build\s+(me|a)|mi\s+plan)\b/i;

function detectsRoutineGeneration(messages: { role: string; content: string }[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  return lastUser ? ROUTINE_INTENT_RE.test(lastUser.content) : false;
}

const ROUTINE_MODE_HINT = `

═══════════════════════════════════════════════════════
MODO RUTINA ACTIVO
═══════════════════════════════════════════════════════
El usuario está pidiendo una rutina/programa estructurado. Ignora el límite de "3-4 oraciones".
Genera una rutina completa con: días de la semana, ejercicios por día, sets × reps, RPE/RIR objetivo, descanso, y notas de progresión semanal. Si faltan datos críticos del usuario (split preferido, días disponibles, ejercicios que evitar, lesiones, foco muscular), pregúntalos PRIMERO en una sola tanda antes de generar.`;

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

  const isRoutineMode = detectsRoutineGeneration(messages);
  const model = isRoutineMode ? 'anthropic/claude-sonnet-4.6' : 'anthropic/claude-haiku-4.5';
  const maxOutputTokens = isRoutineMode ? 2048 : 512;

  const systemPrompt = buildSystemPrompt(userContext) + (isRoutineMode ? ROUTINE_MODE_HINT : '');

  try {
    const { text, usage } = await generateText({
      model,
      maxOutputTokens,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
          // Cache the system prompt — identical across turns of a session.
          // ~90% input-cost reduction on follow-ups (5min TTL covers a chat).
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        ...messages,
      ],
    });

    return NextResponse.json(
      { reply: text, mode: isRoutineMode ? 'routine' : 'qa' },
      {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-Coach-Model': model,
          'X-Coach-Tokens-In': String(usage?.inputTokens ?? 0),
          'X-Coach-Tokens-Out': String(usage?.outputTokens ?? 0),
          'X-Coach-Tokens-Cached': String(usage?.cachedInputTokens ?? 0),
        },
      }
    );
  } catch (err) {
    console.error('[/api/coach] generateText error', err);
    return NextResponse.json(
      { error: 'Error al conectar con el AI. Inténtalo de nuevo.' },
      { status: 502 }
    );
  }
}
