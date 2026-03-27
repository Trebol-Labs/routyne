import { NextRequest, NextResponse } from 'next/server';
import { mediaProvider } from '@/lib/media/providers';
import type { MediaResult } from '@/lib/media/providers';
import exercisesData from '@/lib/data/exercises.json';
import Fuse from 'fuse.js';

interface ExerciseEntry {
  id: string;
  aliases: string[];
  exercisedb_name: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
}

// In-process cache — avoids redundant API calls within a server lifetime
const cache = new Map<string, MediaResult | null>();

// Fuse index: search aliases + id + bodyPart + target for robust fuzzy matching
const fuse = new Fuse(exercisesData as ExerciseEntry[], {
  keys: [
    { name: 'aliases', weight: 2 },
    { name: 'id', weight: 1.5 },
    { name: 'exercisedb_name', weight: 1.5 },
    { name: 'bodyPart', weight: 0.5 },
    { name: 'target', weight: 0.5 },
  ],
  threshold: 0.35,
  includeScore: false,
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
      headers: { 'Cache-Control': process.env.NODE_ENV === 'development' ? 'no-store' : 'public, max-age=2592000' },
    });
  }

  const searchName = resolveSearchName(slug);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[media/route] slug="${slug}" → searchName="${searchName}"`);
  }

  const result = await mediaProvider.resolve(searchName);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[media/route] "${slug}" → ${result ? result.url : '404 (no result)'}`);
  }

  cache.set(slug, result);

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': process.env.NODE_ENV === 'development' ? 'no-store' : 'public, max-age=2592000' },
  });
}
