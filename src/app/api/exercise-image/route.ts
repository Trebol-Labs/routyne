import { NextRequest, NextResponse } from 'next/server';

// In-process GIF cache — survives across requests, cleared on server restart
const cache = new Map<string, Buffer>();

// Rate limiting state
interface RateLimit {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimit>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-real-ip') ||
             request.ip ||
             request.headers.get('x-forwarded-for')?.split(',').map(p => p.trim()).filter(Boolean).pop() ||
             'unknown';
  const now = Date.now();

  // Prevent memory exhaustion from IP spoofing
  if (rateLimits.size > 10000) {
    rateLimits.clear();
  }

  let rateLimit = rateLimits.get(ip);

  if (!rateLimit || rateLimit.resetAt < now) {
    rateLimit = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  rateLimit.count += 1;
  rateLimits.set(ip, rateLimit);

  if (rateLimit.count > MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const key = process.env.RAPIDAPI_KEY;
  if (!key) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  if (cache.has(id)) {
    return new NextResponse(new Uint8Array(cache.get(id)!), {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'public, max-age=2592000',
      },
    });
  }

  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/image?exerciseId=${id}&resolution=360`,
    {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  cache.set(id, buffer);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'public, max-age=2592000',
    },
  });
}
