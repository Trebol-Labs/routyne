import Fuse from 'fuse.js';
import type { MediaProvider, MediaResult } from './types';

interface ExerciseDBItem {
  name: string;
  gifUrl: string;
}

export class ExerciseDBProvider implements MediaProvider {
  async resolve(name: string): Promise<MediaResult | null> {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) {
      console.warn('[ExerciseDB] RAPIDAPI_KEY not set');
      return null;
    }

    try {
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

      if (!res.ok) return null;

      const items: ExerciseDBItem[] = await res.json();
      if (!items.length) return null;

      // Fuse.js best match on returned names
      const fuse = new Fuse(items, { keys: ['name'], threshold: 0.4 });
      const matches = fuse.search(name);
      const best = matches.length ? matches[0].item : items[0];

      return { url: best.gifUrl, type: 'gif' };
    } catch {
      return null;
    }
  }
}
