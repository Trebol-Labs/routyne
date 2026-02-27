import Fuse from 'fuse.js';
import type { MediaProvider, MediaResult } from './types';

interface ExerciseDBItem {
  id: string;
  name: string;
  gifUrl?: string;
  image?: string;
}

const PREFIX_MAP: Record<string, string> = {
  'smith machine': 'barbell',
};

export function generateCandidates(name: string): string[] {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const candidates: string[] = [];

  // Strategy 1: prefix substitution (highest priority — most specific)
  for (const [from, to] of Object.entries(PREFIX_MAP)) {
    const fromWords = from.split(' ');
    if (words.slice(0, fromWords.length).join(' ') === from) {
      candidates.push(to + ' ' + words.slice(fromWords.length).join(' '));
      break;
    }
  }

  // Strategy 2: progressive truncation (drop last word, min 2 words)
  for (let len = words.length - 1; len >= 2; len--) {
    candidates.push(words.slice(0, len).join(' '));
  }

  return candidates;
}

async function searchExerciseDB(
  name: string,
  key: string
): Promise<ExerciseDBItem[]> {
  const encoded = encodeURIComponent(name.toLowerCase());
  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/exercises/name/${encoded}?limit=5&offset=0`,
    {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    }
  );
  if (!res.ok) return [];
  return res.json();
}

export class ExerciseDBProvider implements MediaProvider {
  async resolve(name: string): Promise<MediaResult | null> {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) {
      console.warn('[ExerciseDB] RAPIDAPI_KEY not set');
      return null;
    }

    try {
      // Primary search
      const items = await searchExerciseDB(name, key);
      if (items.length) {
        const r = this.bestMatch(items, name);
        if (r) return r;
      }

      // Cascade: try generated candidates until one returns results
      for (const candidate of generateCandidates(name)) {
        const candidateItems = await searchExerciseDB(candidate, key);
        if (candidateItems.length) {
          const r = this.bestMatch(candidateItems, candidate);
          if (r) return r;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private bestMatch(items: ExerciseDBItem[], name: string): MediaResult | null {
    const fuse = new Fuse(items, { keys: ['name'], threshold: 0.4 });
    const matches = fuse.search(name);
    const best = matches.length ? matches[0].item : items[0];
    // API has used gifUrl, image, and now just id (construct URL from id)
    const url: string | undefined =
      best.gifUrl ||
      best.image ||
      (best.id ? `https://v2.exercisedb.io/image/${best.id}` : undefined);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ExerciseDB] bestMatch "${name}": item="${best.name}" id="${best.id}" url="${url}"`);
    }
    if (!url) return null;
    return { url, type: 'gif' };
  }
}
