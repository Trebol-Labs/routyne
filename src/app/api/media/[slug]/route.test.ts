import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the provider module before importing the route
vi.mock('@/lib/media/providers', () => ({
  mediaProvider: {
    resolve: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  // Clear the module-level cache between tests
  vi.resetModules();
});

describe('GET /api/media/[slug]', () => {
  it('returns 200 with MediaResult for a known exercise slug', async () => {
    const { mediaProvider } = await import('@/lib/media/providers');
    (mediaProvider.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://v2.exercisedb.io/image/abc123',
      type: 'gif',
    });

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/media/barbell-squat');
    const res = await GET(req, { params: Promise.resolve({ slug: 'barbell-squat' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://v2.exercisedb.io/image/abc123');
    expect(body.type).toBe('gif');
  });

  it('returns 404 when provider returns null', async () => {
    const { mediaProvider } = await import('@/lib/media/providers');
    (mediaProvider.resolve as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/media/unknown-exercise');
    const res = await GET(req, { params: Promise.resolve({ slug: 'unknown-exercise' }) });

    expect(res.status).toBe(404);
  });

  it('normalizes slug: dashes become spaces for provider lookup', async () => {
    const { mediaProvider } = await import('@/lib/media/providers');
    (mediaProvider.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://v2.exercisedb.io/image/xyz',
      type: 'gif',
    });

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/media/bicep-curls');
    await GET(req, { params: Promise.resolve({ slug: 'bicep-curls' }) });

    // Provider called with exercisedb_name from exercises.json, not raw slug
    expect(mediaProvider.resolve).toHaveBeenCalledWith('barbell curl');
  });
});
