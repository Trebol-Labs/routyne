import { NextRequest, NextResponse } from 'next/server';
import Fuse from 'fuse.js';
import exercisesSlim from '@/lib/data/exercises.json';
import exercisesFull from '@/lib/data/exercises-full.json';
import type { ExerciseBrowseItem } from '@/types/workout';

type SlimExercise = {
  id: string;
  aliases: string[];
  exercisedb_name: string;
  media_id?: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
};

type FullExercise = {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  difficulty?: string;
};

const DEV = process.env.NODE_ENV === 'development';
const API_KEY = process.env.RAPIDAPI_KEY;

const LOCAL_EXERCISES = exercisesSlim as SlimExercise[];
const FULL_EXERCISES = exercisesFull as FullExercise[];

const slimFuse = new Fuse(LOCAL_EXERCISES, {
  keys: ['aliases', 'exercisedb_name', 'id', 'bodyPart', 'equipment', 'target'],
  threshold: 0.35,
});

const fullFuse = new Fuse(FULL_EXERCISES, {
  keys: ['name', 'bodyPart', 'equipment', 'target'],
  threshold: 0.35,
});

const fullById = new Map(FULL_EXERCISES.map((item) => [item.id, item]));

function normalize(value: string | undefined | null): string {
  return (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ');
}

function matchesFilter(value: string | undefined | null, filter?: string): boolean {
  if (!filter) return true;
  return normalize(value) === normalize(filter);
}

function enrichWithFullData(name: string, mediaId?: string): Pick<ExerciseBrowseItem, 'target' | 'secondaryMuscles' | 'instructions' | 'difficulty'> {
  const byName = fullFuse.search(name)[0]?.item;
  const byId = mediaId ? fullById.get(mediaId) : undefined;
  const details = byName ?? byId;

  return {
    target: details?.target,
    secondaryMuscles: details?.secondaryMuscles,
    instructions: details?.instructions?.slice(0, 5),
    difficulty: details?.difficulty,
  };
}

function localFallback(q?: string, bodyPart?: string, equipment?: string, limit = 20): ExerciseBrowseItem[] {
  const query = normalize(q ?? '');
  const matches = (query
    ? slimFuse.search(query).map((result) => result.item)
    : [...LOCAL_EXERCISES]
  ).filter((item) => matchesFilter(item.bodyPart, bodyPart) && matchesFilter(item.equipment, equipment));

  return matches.slice(0, limit).map((item) => {
    const full = item.media_id ? fullById.get(item.media_id) : undefined;
    const details = full
      ? {
          target: full.target ?? item.target,
          secondaryMuscles: full.secondaryMuscles,
          instructions: full.instructions?.slice(0, 5),
          difficulty: full.difficulty,
        }
      : enrichWithFullData(item.exercisedb_name, item.media_id);

    return {
      id: item.id,
      name: item.exercisedb_name,
      bodyPart: item.bodyPart ?? 'other',
      equipment: item.equipment ?? 'other',
      gifUrl: undefined,
      mediaUrl: item.media_id ? `/api/exercise-image?id=${item.media_id}` : null,
      ...details,
    } satisfies ExerciseBrowseItem;
  });
}

function isBodyPartMatch(value: string | undefined, bodyPart?: string): boolean {
  return matchesFilter(value, bodyPart);
}

function isEquipmentMatch(value: string | undefined, equipment?: string): boolean {
  return matchesFilter(value, equipment);
}

function filterRemoteItems(
  items: Array<{ id: string; name: string; bodyPart: string; equipment: string; gifUrl?: string }>,
  bodyPart?: string,
  equipment?: string
): Array<{ id: string; name: string; bodyPart: string; equipment: string; gifUrl?: string }> {
  return items.filter((item) => isBodyPartMatch(item.bodyPart, bodyPart) && isEquipmentMatch(item.equipment, equipment));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? undefined;
  const bodyPartParam = searchParams.get('bodyPart') ?? undefined;
  const equipmentParam = searchParams.get('equipment') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 50);

  const cacheKey = `${q ?? ''}|${bodyPartParam ?? ''}|${equipmentParam ?? ''}|${limit}`;

  if (cache.has(cacheKey)) {
    return NextResponse.json(cache.get(cacheKey), {
      headers: { 'Cache-Control': DEV ? 'no-store' : 's-maxage=3600' },
    });
  }

  if (!API_KEY) {
    const data = localFallback(q, bodyPartParam, equipmentParam, limit);
    cache.set(cacheKey, data);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': DEV ? 'no-store' : 's-maxage=3600' },
    });
  }

  try {
    let url: string;
    if (q) {
      url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(q)}?limit=${limit}`;
    } else if (bodyPartParam) {
      url = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(bodyPartParam)}?limit=${limit}`;
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
      id: string;
      name: string;
      bodyPart: string;
      equipment: string;
      gifUrl?: string;
    }>;

    const filtered = filterRemoteItems(raw, bodyPartParam, equipmentParam);
    const data: ExerciseBrowseItem[] = filtered.map((item) => {
      const local = slimFuse.search(item.name)[0]?.item;
      const mediaId = local?.media_id;
      const details = enrichWithFullData(item.name, mediaId);
      return {
        id: item.id,
        name: item.name,
        bodyPart: item.bodyPart,
        equipment: item.equipment,
        gifUrl: item.gifUrl,
        mediaUrl: item.gifUrl ?? (mediaId ? `/api/exercise-image?id=${mediaId}` : null),
        ...details,
      };
    });

    cache.set(cacheKey, data);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': DEV ? 'no-store' : 's-maxage=3600' },
    });
  } catch {
    const data = localFallback(q, bodyPartParam, equipmentParam, limit);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

const cache = new Map<string, ExerciseBrowseItem[]>();
