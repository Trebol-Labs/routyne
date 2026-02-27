import { NextRequest, NextResponse } from 'next/server';
import { mediaProvider } from '@/lib/media/providers';
import type { MediaResult } from '@/lib/media/providers';
import exercisesData from '@/lib/data/exercises.json';
import Fuse from 'fuse.js';

interface ExerciseEntry {
  id: string;
  aliases: string[];
  exercisedb_name: string;
}

// In-process cache — avoids redundant API calls within a server lifetime
const cache = new Map<string, MediaResult | null>();

// Fuse index for looking up exercisedb_name by slug/name
const fuse = new Fuse(exercisesData as ExerciseEntry[], {
  keys: ['aliases', 'id'],
  threshold: 0.35,
});

function resolveSearchName(slug: string): string {
  const name = slug
    .replace(/-/g, ' ')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
  const matches = fuse.search(name);
  if (matches.length) {
    return matches[0].item.exercisedb_name;
  }
  return name;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (cache.has(slug)) {
    const cached = cache.get(slug)!;
    if (!cached) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=2592000' },
    });
  }

  const searchName = resolveSearchName(slug);
  const result = await mediaProvider.resolve(searchName);

  cache.set(slug, result);

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=2592000' },
  });
}
