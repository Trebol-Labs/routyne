import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/exercises/browse', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns enriched local fallback data with demo metadata', async () => {
    vi.stubEnv('RAPIDAPI_KEY', '');

    const { GET } = await import('./route');
    const response = await GET(new NextRequest('http://localhost/api/exercises/browse?q=barbell%20pullover%20to%20press&limit=1'));
    const body = await response.json() as Array<{
      id: string;
      name: string;
      bodyPart: string;
      equipment: string;
      mediaUrl?: string | null;
      target?: string;
      secondaryMuscles?: string[];
      instructions?: string[];
      difficulty?: string;
    }>;

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: 'barbell_pullover_to_press',
      name: 'barbell pullover to press',
      bodyPart: 'back',
      equipment: 'barbell',
      mediaUrl: '/api/exercise-image?id=0022',
      target: 'lats',
      difficulty: 'intermediate',
    });
    expect(body[0].secondaryMuscles).toEqual(expect.arrayContaining(['triceps', 'chest', 'shoulders']));
    expect(body[0].instructions).toHaveLength(5);
    expect(body[0].instructions?.[0]).toContain('Lie flat on a bench');
  });

  it('filters remote results and enriches the matching exercise', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'test-key');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          id: '0022',
          name: 'barbell pullover to press',
          bodyPart: 'back',
          equipment: 'barbell',
          gifUrl: 'https://example.com/pullover.gif',
        },
        {
          id: '9999',
          name: 'dumbbell fly',
          bodyPart: 'chest',
          equipment: 'dumbbell',
          gifUrl: 'https://example.com/fly.gif',
        },
      ]),
    } as Response);

    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./route');
    const response = await GET(new NextRequest('http://localhost/api/exercises/browse?bodyPart=back&equipment=barbell&limit=10'));
    const body = await response.json() as Array<{
      id: string;
      name: string;
      bodyPart: string;
      equipment: string;
      mediaUrl?: string | null;
      target?: string;
      difficulty?: string;
    }>;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('exercises/bodyPart/back?limit=10');
    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: '0022',
      name: 'barbell pullover to press',
      bodyPart: 'back',
      equipment: 'barbell',
      mediaUrl: 'https://example.com/pullover.gif',
      target: 'lats',
      difficulty: 'intermediate',
    });
  });
});
