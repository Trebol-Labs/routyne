import { NextRequest } from 'next/server';
import { GET } from './route';

describe('Exercise Image API Rate Limiting', () => {
  beforeEach(() => {
    // We can't directly reset the module-level variable easily without vi.resetModules(),
    // but vi.resetModules() can be tricky. We will mock Date.now to fast-forward time to reset limits.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockRequest = (ip: string, id: string = '0001') => {
    const url = new URL(`http://localhost/api/exercise-image?id=${id}`);
    return new NextRequest(url, {
      headers: new Headers({
        'x-forwarded-for': ip,
      }),
    });
  };

  it('allows requests within the rate limit', async () => {
    const ip = '192.168.1.1';

    // We only test the rate limiting part. To avoid fetching external APIs,
    // we'll mock fetch or just expect the missing API key error if it passes rate limiting.
    const originalEnv = process.env.RAPIDAPI_KEY;
    delete process.env.RAPIDAPI_KEY;

    // Send 60 requests (the limit)
    for (let i = 0; i < 60; i++) {
      const req = createMockRequest(ip);
      const res = await GET(req);
      // If it passes rate limiting, it should hit the missing API key check and return 500
      expect(res.status).toBe(500);
    }

    process.env.RAPIDAPI_KEY = originalEnv;
  });

  it('blocks requests exceeding the rate limit', async () => {
    const ip = '192.168.1.2';

    const originalEnv = process.env.RAPIDAPI_KEY;
    delete process.env.RAPIDAPI_KEY;

    // Send 60 requests (the limit)
    for (let i = 0; i < 60; i++) {
      const req = createMockRequest(ip);
      const res = await GET(req);
      expect(res.status).toBe(500);
    }

    // The 61st request should be rate limited
    const req61 = createMockRequest(ip);
    const res61 = await GET(req61);
    expect(res61.status).toBe(429);

    const data = await res61.json();
    expect(data.error).toBe('Too Many Requests');

    // Fast forward time by 60 seconds to reset the window
    vi.advanceTimersByTime(60 * 1000 + 1);

    // Request should be allowed again
    const req62 = createMockRequest(ip);
    const res62 = await GET(req62);
    expect(res62.status).toBe(500); // Passes rate limiting

    process.env.RAPIDAPI_KEY = originalEnv;
  });

  it('tracks rate limits per IP independently', async () => {
    const ip1 = '192.168.1.3';
    const ip2 = '192.168.1.4';

    const originalEnv = process.env.RAPIDAPI_KEY;
    delete process.env.RAPIDAPI_KEY;

    // IP1 sends 60 requests
    for (let i = 0; i < 60; i++) {
      const req = createMockRequest(ip1);
      const res = await GET(req);
      expect(res.status).toBe(500);
    }

    // IP1 is now blocked
    const blockedReq = createMockRequest(ip1);
    const blockedRes = await GET(blockedReq);
    expect(blockedRes.status).toBe(429);

    // IP2 should still be allowed
    const allowedReq = createMockRequest(ip2);
    const allowedRes = await GET(allowedReq);
    expect(allowedRes.status).toBe(500); // Passes rate limiting

    process.env.RAPIDAPI_KEY = originalEnv;
  });
});
