import { NextRequest, NextResponse } from 'next/server';
import exercisesRaw from '@/lib/data/exercises.json';
import type { ExerciseBrowseItem } from '@/types/workout';

const DEV = process.env.NODE_ENV === 'development';
const API_KEY = process.env.RAPIDAPI_KEY;

// Body part → ExerciseDB body part mapping
const BODY_PART_MAP: Record<string, string> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  arms: 'upper arms',
  legs: 'upper legs',
  core: 'waist',
};

// Simple alias → body part heuristic for local fallback
const LOCAL_BODY_PART: Record<string, string> = {
  bench_press: 'chest', push_up: 'chest', fly: 'chest',
  deadlift: 'back', pull_up: 'back', row: 'back', lat: 'back',
  overhead_press: 'shoulders', lateral_raise: 'shoulders',
  curl: 'arms', tricep: 'arms', skullcrusher: 'arms',
  squat: 'legs', lunge: 'legs', leg_press: 'legs', rdl: 'legs',
  plank: 'core', crunch: 'core', ab: 'core',
};

function guessBodyPart(id: string): string {
  for (const [key, part] of Object.entries(LOCAL_BODY_PART)) {
    if (id.includes(key)) return part;
  }
  return 'other';
}

// In-process cache
const cache = new Map<string, ExerciseBrowseItem[]>();

function localFallback(q?: string, bodyPart?: string, limit = 20): ExerciseBrowseItem[] {
  const exercises = exercisesRaw as Array<{ id: string; aliases: string[]; exercisedb_name?: string }>;
  return exercises
    .filter((ex) => {
      const bp = guessBodyPart(ex.id);
      if (bodyPart && bp !== bodyPart) return false;
      if (q) {
        const query = q.toLowerCase();
        return ex.aliases.some((a) => a.toLowerCase().includes(query)) || ex.id.includes(query);
      }
      return true;
    })
    .slice(0, limit)
    .map((ex) => ({
      id: ex.id,
      name: ex.exercisedb_name ?? ex.aliases[0] ?? ex.id,
      bodyPart: guessBodyPart(ex.id),
      equipment: 'barbell',
    }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? undefined;
  const bodyPartParam = searchParams.get('bodyPart') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

  const cacheKey = `${q ?? ''}|${bodyPartParam ?? ''}|${limit}`;

  if (cache.has(cacheKey)) {
    return NextResponse.json(cache.get(cacheKey), {
      headers: { 'Cache-Control': DEV ? 'no-store' : 's-maxage=3600' },
    });
  }

  // No API key → local fallback
  if (!API_KEY) {
    const data = localFallback(q, bodyPartParam, limit);
    cache.set(cacheKey, data);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': DEV ? 'no-store' : 's-maxage=3600' },
    });
  }

  try {
    const edbBodyPart = bodyPartParam ? BODY_PART_MAP[bodyPartParam] ?? bodyPartParam : undefined;

    let url: string;
    if (q) {
      url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(q)}?limit=${limit}`;
    } else if (edbBodyPart) {
      url = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(edbBodyPart)}?limit=${limit}`;
    } else {
      url = `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}`;
    }

    const res = await fetch(url, {
      headers: {
        'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
        'x-rapidapi-key': API_KEY,
      },
      cache: DEV ? 'no-store' : 'default',
    });

    if (!res.ok) throw new Error(`ExerciseDB ${res.status}`);

    const raw = await res.json() as Array<{
      id: string; name: string; bodyPart: string; equipment: string; gifUrl?: string;
    }>;

    const data: ExerciseBrowseItem[] = raw.map((ex) => ({
      id: ex.id,
      name: ex.name,
      bodyPart: ex.bodyPart,
      equipment: ex.equipment,
      gifUrl: ex.gifUrl,
    }));

    cache.set(cacheKey, data);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': DEV ? 'no-store' : 's-maxage=3600' },
    });
  } catch {
    // Fallback to local on any API error
    const data = localFallback(q, bodyPartParam, limit);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
