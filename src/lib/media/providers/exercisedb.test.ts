import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('RAPIDAPI_KEY', 'test-key');
});

describe('ExerciseDBProvider', () => {
  it('resolves a known exercise name to a gif MediaResult', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { name: 'barbell squat', gifUrl: 'https://v2.exercisedb.io/image/abc123' },
      ],
    } as Response);

    const { ExerciseDBProvider } = await import('./exercisedb');
    const provider = new ExerciseDBProvider();
    const result = await provider.resolve('barbell squat');

    expect(result).not.toBeNull();
    expect(result!.url).toBe('https://v2.exercisedb.io/image/abc123');
    expect(result!.type).toBe('gif');
  });

  it('returns null when ExerciseDB returns empty array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { ExerciseDBProvider } = await import('./exercisedb');
    const provider = new ExerciseDBProvider();
    const result = await provider.resolve('not a real exercise xyz');

    expect(result).toBeNull();
  });

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const { ExerciseDBProvider } = await import('./exercisedb');
    const provider = new ExerciseDBProvider();
    const result = await provider.resolve('squat');

    expect(result).toBeNull();
  });
});
