# Exercise Media Sourcing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace stub `.webm` references with runtime-resolved animated GIFs from ExerciseDB, with a provider abstraction layer for future monetization.

**Architecture:** `resolveExerciseMedia()` emits a slug URL (`/api/media/{slug}`). A Next.js API route fetches ExerciseDB at runtime and returns `{ url, type, fallbackUrl }`. ExerciseCard fetches this metadata on mount and renders `<img>` (gif/image) or `<video>` based on type. PWA caches both the JSON metadata and the external GIF URLs.

**Tech Stack:** Next.js 16 App Router API routes, ExerciseDB via RapidAPI, Fuse.js, Vitest + jsdom, TypeScript strict

---

## Task 1 — Provider Abstraction + ExerciseDB Implementation

**Files:**
- Create: `src/lib/media/providers/types.ts`
- Create: `src/lib/media/providers/exercisedb.ts`
- Create: `src/lib/media/providers/index.ts`
- Create: `src/lib/media/providers/exercisedb.test.ts`

**Context:** The provider interface decouples the API route from ExerciseDB. `exercisedb.ts` calls `https://exercisedb.p.rapidapi.com/exercises/name/{name}?limit=5` with `X-RapidAPI-Key` and `X-RapidAPI-Host` headers. The response is an array of exercise objects each with a `gifUrl` string. We pick the best match using Fuse.js on the returned `name` fields. `index.ts` exports whichever provider is active — for now always ExerciseDB.

ExerciseDB response shape (one item):
```json
{
  "id": "0001",
  "name": "barbell squat",
  "gifUrl": "https://v2.exercisedb.io/image/HFMRqUINyD-9Ea",
  "bodyPart": "waist",
  "equipment": "barbell",
  "target": "glutes"
}
```

---

**Step 1: Create `src/lib/media/providers/types.ts`**

```typescript
export interface MediaResult {
  url: string;
  type: 'gif' | 'image' | 'video';
  fallbackUrl?: string;
}

export interface MediaProvider {
  resolve(name: string): Promise<MediaResult | null>;
}
```

---

**Step 2: Write the failing test**

Create `src/lib/media/providers/exercisedb.test.ts`:

```typescript
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
```

---

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/media/providers/exercisedb.test.ts
```
Expected: FAIL — `Cannot find module './exercisedb'`

---

**Step 4: Create `src/lib/media/providers/exercisedb.ts`**

```typescript
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
```

---

**Step 5: Create `src/lib/media/providers/index.ts`**

```typescript
import { ExerciseDBProvider } from './exercisedb';
import type { MediaProvider } from './types';

export const mediaProvider: MediaProvider = new ExerciseDBProvider();
export type { MediaResult, MediaProvider } from './types';
```

---

**Step 6: Run tests to verify they pass**

```bash
npx vitest run src/lib/media/providers/exercisedb.test.ts
```
Expected: PASS ×3

---

**Step 7: Commit**

```bash
git add src/lib/media/providers/
git commit -m "feat(media): add provider abstraction and ExerciseDB implementation"
```

---

## Task 2 — Update exercises.json with exercisedb_name

**Files:**
- Modify: `src/lib/data/exercises.json`

**Context:** Adding `exercisedb_name` gives the API route the canonical name ExerciseDB uses internally, producing better matches than slugified user input. The `media_id` field is kept for backwards compatibility but is no longer used at runtime.

---

**Step 1: Update `src/lib/data/exercises.json`**

Replace the entire file content:

```json
[
  {
    "id": "bench_press",
    "aliases": ["bench press", "press de banca", "chest press", "benchpress", "banca"],
    "exercisedb_name": "barbell bench press",
    "media_id": "bench_press_demo"
  },
  {
    "id": "deadlift",
    "aliases": ["deadlift", "peso muerto", "conventional deadlift"],
    "exercisedb_name": "deadlift",
    "media_id": "deadlift_demo"
  },
  {
    "id": "overhead_press",
    "aliases": ["overhead press", "ohp", "military press", "press militar", "shoulder press", "press de hombro"],
    "exercisedb_name": "barbell overhead press",
    "media_id": "overhead_press_demo"
  },
  {
    "id": "pull_up",
    "aliases": ["pull up", "chin up", "pullups", "dominadas", "pull-ups"],
    "exercisedb_name": "pull-up",
    "media_id": "pull_up_demo"
  },
  {
    "id": "push_up",
    "aliases": ["push up", "pushups", "push-ups", "flexiones", "lagartijas", "floor press"],
    "exercisedb_name": "push-up",
    "media_id": "push_up_demo"
  },
  {
    "id": "squat",
    "aliases": ["squat", "squats", "sentadillas", "back squat", "barbell squat"],
    "exercisedb_name": "barbell squat",
    "media_id": "squat_demo"
  },
  {
    "id": "plank",
    "aliases": ["plank", "planks", "plancha", "isometric plank", "core plank"],
    "exercisedb_name": "plank",
    "media_id": "plank_demo"
  },
  {
    "id": "lunges",
    "aliases": ["lunges", "estocadas", "walking lunges", "zancadas"],
    "exercisedb_name": "lunge",
    "media_id": "lunges_demo"
  },
  {
    "id": "bicep_curls",
    "aliases": ["bicep curls", "curls de biceps", "curl", "biceps"],
    "exercisedb_name": "barbell curl",
    "media_id": "bicep_curls_demo"
  }
]
```

---

**Step 2: Commit**

```bash
git add src/lib/data/exercises.json
git commit -m "feat(media): add exercisedb_name to exercise entries"
```

---

## Task 3 — Update resolver.ts + Fix Parser Test

**Files:**
- Modify: `src/lib/media/resolver.ts`
- Modify: `src/lib/markdown/parser.test.ts`

**Context:** The resolver no longer does fuzzy matching at parse time. It just slugifies the name and returns an API path. The existing parser test asserts `exercise.mediaUrl === '/media/squat_demo.webm'` — that will break and must be updated to match the new slug format.

---

**Step 1: Update `src/lib/media/resolver.ts`**

Replace the entire file:

```typescript
/**
 * Converts a raw exercise name into a stable API slug path.
 * The actual media resolution happens at runtime in /api/media/[slug].
 *
 * Example: resolveExerciseMedia("Barbell Squat") -> "/api/media/barbell-squat"
 */
export function resolveExerciseMedia(rawName: string): string | null {
  if (!rawName.trim()) return null;
  const slug = rawName.trim().toLowerCase().replace(/\s+/g, '-');
  return `/api/media/${slug}`;
}
```

---

**Step 2: Run full test suite to see what breaks**

```bash
npm test
```
Expected: parser test fails — `expect(exercise.mediaUrl).toBe('/media/squat_demo.webm')` no longer matches

---

**Step 3: Update the failing parser test in `src/lib/markdown/parser.test.ts`**

Find and replace the media URL assertion:

```typescript
// Before:
expect(exercise.mediaUrl).toBe('/media/squat_demo.webm');

// After:
expect(exercise.mediaUrl).toBe('/api/media/sentadillas');
```

---

**Step 4: Run tests to verify all pass**

```bash
npm test
```
Expected: all 20 tests PASS

---

**Step 5: Commit**

```bash
git add src/lib/media/resolver.ts src/lib/markdown/parser.test.ts
git commit -m "feat(media): resolver now emits /api/media/{slug} paths"
```

---

## Task 4 — API Route

**Files:**
- Create: `src/app/api/media/[slug]/route.ts`
- Create: `src/app/api/media/[slug]/route.test.ts`

**Context:** The route normalizes the slug, checks `exercises.json` for a known `exercisedb_name` (fast path), then calls the active media provider. An in-process Map caches results for the lifetime of the server process. Response includes `Cache-Control: public, max-age=2592000` so browsers and the PWA cache it for 30 days. Returns `404` JSON when provider returns null.

---

**Step 1: Write failing tests**

Create `src/app/api/media/[slug]/route.test.ts`:

```typescript
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

    // Provider called with spaces, not dashes
    expect(mediaProvider.resolve).toHaveBeenCalledWith('barbell curl');
  });
});
```

---

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/api/media/
```
Expected: FAIL — `Cannot find module './route'`

---

**Step 3: Create `src/app/api/media/[slug]/route.ts`**

```typescript
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
  const name = slug.replace(/-/g, ' ');
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
```

---

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/api/media/
```
Expected: PASS ×3

---

**Step 5: Run full suite**

```bash
npm test
```
Expected: all tests PASS

---

**Step 6: Commit**

```bash
git add src/app/api/media/
git commit -m "feat(media): add /api/media/[slug] route with ExerciseDB resolution"
```

---

## Task 5 — next.config.ts Updates

**Files:**
- Modify: `next.config.ts`

**Context:** Two changes: (1) Add `v2.exercisedb.io` to `images.remotePatterns` so Next.js `<img>` doesn't block ExerciseDB URLs. (2) Add a PWA runtime cache entry for ExerciseDB GIF URLs so they work offline after first view.

---

**Step 1: Update `next.config.ts`**

```typescript
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^\/api\/media\/.+$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "routyne-media-metadata",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/v2\.exercisedb\.io\/.+$/,
        handler: "CacheFirst",
        options: {
          cacheName: "routyne-media-gifs",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v2.exercisedb.io',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
```

---

**Step 2: Verify build**

```bash
npm run build
```
Expected: Compiled successfully, no TypeScript errors

---

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(pwa): cache ExerciseDB GIFs and media metadata API responses"
```

---

## Task 6 — ExerciseCard Media Fetch + Render Cascade

**Files:**
- Modify: `src/components/workout/ExerciseCard.tsx`

**Context:** `exercise.mediaUrl` now points to `/api/media/{slug}` (a JSON endpoint). ExerciseCard must fetch that endpoint on mount to get `{ url, type }`, then render `<video>` or `<img>` based on type. The existing skeleton shows while loading. Existing `onError` fallback → Dumbbell icon is kept. The `isPlaying` hover-to-play behaviour applies only to `type === 'video'`; GIFs auto-animate.

---

**Step 1: Update `src/components/workout/ExerciseCard.tsx`**

Replace the component (keep all existing imports and JSX structure, only the media section changes):

```typescript
'use client';

import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ParsedExercise } from '@/types/workout';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell, PlayCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaResult } from '@/lib/media/providers';

interface ExerciseCardProps {
  exercise: ParsedExercise;
  index: number;
}

export function ExerciseCard({ exercise, index }: ExerciseCardProps) {
  const [media, setMedia] = React.useState<MediaResult | null>(null);
  const [mediaLoaded, setMediaLoaded] = React.useState(false);
  const [mediaError, setMediaError] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0]);
  const scale = useTransform(x, [-100, 0, 100], [0.95, 1, 0.95]);

  React.useEffect(() => {
    if (!exercise.mediaUrl) return;
    fetch(exercise.mediaUrl)
      .then(r => r.ok ? r.json() : null)
      .then((data: MediaResult | null) => setMedia(data))
      .catch(() => setMediaError(true));
  }, [exercise.mediaUrl]);

  const showFallback = mediaError || (!media && !exercise.mediaUrl);
  const isVideo = media?.type === 'video';
  const isGif = media?.type === 'gif' || media?.type === 'image';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ x, opacity, scale }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      className="group relative h-full"
    >
      <div className="absolute inset-0 bg-blue-500/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="relative glass-panel rounded-[2.5rem] overflow-hidden p-5 sm:p-6 transition-all duration-500 hover:border-white/20 hover:bg-white/[0.05] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-6">

        {/* Media Section */}
        <div
          className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-black/40 overflow-hidden shrink-0 border border-white/10 shadow-inner group-hover:scale-[1.03] transition-transform duration-700 mx-auto sm:mx-0"
          onMouseEnter={() => setIsPlaying(true)}
          onMouseLeave={() => setIsPlaying(false)}
        >
          {!mediaLoaded && !showFallback && (
            <Skeleton className="absolute inset-0 w-full h-full bg-white/5" />
          )}

          {showFallback && (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              <Dumbbell className="w-12 h-12" />
            </div>
          )}

          {isVideo && media && (
            <video
              src={media.url}
              autoPlay={isPlaying}
              muted
              loop
              playsInline
              className={cn(
                "w-full h-full object-cover transition-all duration-1000",
                mediaLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110",
                isPlaying ? "brightness-110 scale-110" : "brightness-50"
              )}
              onLoadedData={() => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
            />
          )}

          {isGif && media && (
            <img
              src={media.url}
              alt={`${exercise.cleanName} form demonstration`}
              className={cn(
                "w-full h-full object-cover transition-all duration-1000",
                mediaLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setMediaLoaded(true)}
              onError={() => {
                if (media.fallbackUrl) {
                  setMedia({ ...media, url: media.fallbackUrl, type: 'image', fallbackUrl: undefined });
                } else {
                  setMediaError(true);
                }
              }}
            />
          )}

          {isVideo && !isPlaying && media && !mediaError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
              <PlayCircle className="w-8 h-8 text-white/40 group-hover:text-white/80 transition-all scale-90 group-hover:scale-100" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-grow min-w-0 flex flex-col justify-center space-y-3 text-left w-full">
          <div className="flex items-start justify-between gap-3 w-full">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-tight group-hover:text-blue-400 transition-colors break-words">
              {exercise.cleanName.toUpperCase()}
            </h3>
            <button
              className="hidden sm:block text-white/10 hover:text-white transition-all shrink-0 mt-1"
              title="More info"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/[0.03] shadow-inner">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">Sets</span>
              <span className="text-base font-black text-white/90">{exercise.sets}</span>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/[0.03] shadow-inner">
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.25em]">Reps</span>
              <span className="text-base font-black text-white/90">
                {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Liquid Indicator */}
        <div className="hidden sm:flex flex-col justify-center gap-2 pr-2 shrink-0">
           <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse" />
           <div className="w-2 h-2 rounded-full bg-white/5" />
           <div className="w-2 h-2 rounded-full bg-white/5" />
        </div>
      </div>
    </motion.div>
  );
}
```

---

**Step 2: Run build to check for TypeScript errors**

```bash
npm run build
```
Expected: Compiled successfully

---

**Step 3: Run full test suite**

```bash
npm test
```
Expected: all tests PASS (ExerciseCard has no unit tests for the media section — visual verification is done in the browser)

---

**Step 4: Commit**

```bash
git add src/components/workout/ExerciseCard.tsx
git commit -m "feat(ui): ExerciseCard fetches media metadata and renders gif/video by type"
```

---

## Task 7 — Environment Files

**Files:**
- Create: `.env.local`
- Create: `.env.local.example`

**Context:** `.env*` is already in `.gitignore`. `.env.local` holds real secrets (never committed). `.env.local.example` is the committed template with placeholder values.

---

**Step 1: Create `.env.local.example`**

```bash
# ExerciseDB via RapidAPI — required for exercise media GIFs
# Get your key at: https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
RAPIDAPI_KEY=your_rapidapi_key_here

# Optional: Claude Vision form validation
# Set EXERCISE_FORM_VALIDATE=true to enable AI form quality checks
ANTHROPIC_API_KEY=your_anthropic_key_here
EXERCISE_FORM_VALIDATE=false
```

---

**Step 2: Create `.env.local`**

Copy `.env.local.example` to `.env.local` and fill in real keys:

```bash
RAPIDAPI_KEY=           # paste your RapidAPI key
ANTHROPIC_API_KEY=      # paste your Anthropic key (optional)
EXERCISE_FORM_VALIDATE=false
```

---

**Step 3: Verify `.env.local` is gitignored**

```bash
git status
```
Expected: `.env.local` does NOT appear in untracked files (`.env*` pattern in `.gitignore` covers it)

---

**Step 4: Commit the example file**

```bash
git add .env.local.example
git commit -m "chore: add .env.local.example with ExerciseDB and Anthropic key docs"
```

---

## Final Verification

```bash
# All tests pass
npm test

# Production build clean
npm run build

# Manual smoke test:
# 1. Add RAPIDAPI_KEY to .env.local
# 2. npm run dev
# 3. Upload a routine with "Squat" and "Bench Press" exercises
# 4. Navigate to routine-overview — GIFs should load in ExerciseCard within 1-2s
# 5. Hard-refresh — GIFs load instantly from PWA cache
# 6. DevTools → Network → Offline → reload — GIFs still visible (cached)
```
