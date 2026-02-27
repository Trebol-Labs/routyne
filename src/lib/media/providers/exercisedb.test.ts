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

describe('generateCandidates', () => {
  it('substitutes "smith machine" prefix with "barbell"', async () => {
    const { generateCandidates } = await import('./exercisedb');
    const candidates = generateCandidates('smith machine incline press');
    expect(candidates[0]).toBe('barbell incline press');
  });

  it('generates progressive word truncations', async () => {
    const { generateCandidates } = await import('./exercisedb');
    const candidates = generateCandidates('cable overhead triceps extension');
    expect(candidates).toContain('cable overhead triceps');
  });

  it('does not produce candidates shorter than 2 words', async () => {
    const { generateCandidates } = await import('./exercisedb');
    const candidates = generateCandidates('triceps extension');
    expect(candidates.every(c => c.split(' ').length >= 2)).toBe(true);
  });
});

describe('cascade fallback', () => {
  it('resolves via candidate when initial search returns empty', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { name: 'barbell incline bench press', gifUrl: 'https://v2.exercisedb.io/image/incline' },
        ],
      } as Response);

    const { ExerciseDBProvider } = await import('./exercisedb');
    const provider = new ExerciseDBProvider();
    const result = await provider.resolve('smith machine incline press');

    expect(result).not.toBeNull();
    expect(result!.url).toBe('https://v2.exercisedb.io/image/incline');
  });

  it('returns null when all candidates are exhausted', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { ExerciseDBProvider } = await import('./exercisedb');
    const provider = new ExerciseDBProvider();
    const result = await provider.resolve('completely unknown exercise xyz abc');

    expect(result).toBeNull();
  });

  it('stops at first successful candidate and does not over-fetch', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'cable overhead triceps extension (rope attachment)', gifUrl: 'https://v2.exercisedb.io/image/tri' }],
      } as Response)
      .mockResolvedValue({ ok: true, json: async () => [] } as Response);
    global.fetch = fetchMock;

    const { ExerciseDBProvider } = await import('./exercisedb');
    const provider = new ExerciseDBProvider();
    await provider.resolve('cable overhead triceps extension');

    // Should stop after second fetch (first candidate hit), not exhaust all
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
