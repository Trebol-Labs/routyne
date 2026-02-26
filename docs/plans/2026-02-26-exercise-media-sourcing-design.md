# Exercise Media Sourcing — Design Document

**Date:** 2026-02-26
**Status:** Approved
**Scope:** Runtime media resolution via ExerciseDB API with optional Claude Vision form validation

---

## Problem

`public/media/` does not exist. All `.webm` references in `exercises.json` are stubs that 404. The `onError` fallback shows a dumbbell icon, but no actual exercise form media is ever displayed.

---

## Goals

- Show animated exercise form demonstrations at runtime (on-demand)
- Support video → GIF → image cascade with dumbbell icon as final fallback
- Keep app offline-capable after first view (PWA NetworkFirst cache)
- Personal use now; architecture must be swappable for monetization without rewriting ExerciseCard

---

## Architecture

### Data Flow

```
parseRoutine(markdown)
  └→ resolveExerciseMedia(name)
       └→ /api/media/{slug}           ← stored as exercise.mediaUrl in Zustand

ExerciseCard mounts
  └→ fetch(exercise.mediaUrl)         ← JSON metadata endpoint
       └→ GET /api/media/[slug]
            ├→ exercises.json direct lookup (exercisedb_name field)
            ├→ OR ExerciseDB fuzzy search fallback
            ├→ optional Claude Vision form validation
            └→ { url, type, fallbackUrl }

ExerciseCard renders
  ├→ type='video'   → <video src={url}>
  ├→ type='gif'     → <img src={url}>
  ├→ type='image'   → <img src={url}>
  └→ error / null   → <Dumbbell> icon at text-white/30
```

### Resolver Change

`resolveExerciseMedia(name)` stops doing Fuse.js at parse time. It now returns a stable slug:

```typescript
export function resolveExerciseMedia(name: string): string | null {
  if (!name.trim()) return null;
  return `/api/media/${name.toLowerCase().replace(/\s+/g, '-')}`;
}
```

Fuzzy matching moves to the API route where it runs against ExerciseDB's full 1,300+ exercise catalog.

---

## API Route

**`src/app/api/media/[slug]/route.ts`**

### Steps

1. Normalize slug → search name (`"barbell-squat"` → `"barbell squat"`)
2. Check in-process Map cache — return immediately if already resolved
3. Look up `exercisedb_name` in `exercises.json` for known exercises (direct lookup, no API call)
4. Otherwise: query ExerciseDB `GET /exercises/name/{name}?limit=5`
5. Fuse.js best-match on returned names
6. **Optional Claude Vision gate** (env: `EXERCISE_FORM_VALIDATE=true`):
   - Prompt: *"Does this GIF demonstrate correct form for {exercise}? Answer YES or NO."*
   - If NO → try next ExerciseDB result → if all fail → return `null`
7. Return JSON + `Cache-Control: public, max-age=2592000`

### Response Shape

```json
{
  "url": "https://v2.exercisedb.io/.../barbell-squat.gif",
  "type": "gif",
  "fallbackUrl": "https://v2.exercisedb.io/.../barbell-squat-thumb.jpg"
}
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RAPIDAPI_KEY` | Yes | ExerciseDB API access |
| `ANTHROPIC_API_KEY` | No | Claude Vision form validation |
| `EXERCISE_FORM_VALIDATE` | No | Enable validation gate (default: `false`) |

---

## Provider Abstraction

```
src/lib/media/providers/
  types.ts          ← MediaResult + MediaProvider interfaces
  exercisedb.ts     ← ExerciseDB implementation (current)
  index.ts          ← exports active provider from MEDIA_PROVIDER env var
```

```typescript
// types.ts
export interface MediaResult {
  url: string;
  type: 'gif' | 'image' | 'video';
  fallbackUrl?: string;
}

export interface MediaProvider {
  resolve(name: string): Promise<MediaResult | null>;
}
```

Swapping to a licensed provider at monetization = add a new file, change one env var. API route and ExerciseCard unchanged.

---

## ExerciseCard Changes

Add media fetch on mount:

```typescript
const [media, setMedia] = useState<MediaResult | null>(null);
const [mediaError, setMediaError] = useState(false);

useEffect(() => {
  if (!exercise.mediaUrl) return;
  fetch(exercise.mediaUrl)
    .then(r => r.ok ? r.json() : null)
    .then(setMedia)
    .catch(() => setMediaError(true));
}, [exercise.mediaUrl]);
```

Render cascade:
- Skeleton while `!media && !mediaError`
- `type === 'video'` → existing `<video>` element
- `type === 'gif' | 'image'` → `<img>` with `onLoad` + `onError`
- `mediaError || !media` → Dumbbell fallback

---

## exercises.json Update

Add `exercisedb_name` to all 9 existing entries for direct lookup (bypasses API rate limits for known exercises):

```json
{
  "id": "squat",
  "aliases": ["squat", "squats", "sentadillas"],
  "exercisedb_name": "barbell squat",
  "media_id": "squat_demo"
}
```

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `src/lib/media/resolver.ts` | Modified | Slug-only output, remove Fuse.js |
| `src/lib/data/exercises.json` | Modified | Add `exercisedb_name` to all entries |
| `next.config.ts` | Modified | Add ExerciseDB hostname to `images.remotePatterns` |
| `src/components/workout/ExerciseCard.tsx` | Modified | Fetch media metadata, render gif/image/video by type |
| `src/app/api/media/[slug]/route.ts` | Created | Core API route |
| `src/lib/media/providers/types.ts` | Created | Provider interface |
| `src/lib/media/providers/exercisedb.ts` | Created | ExerciseDB implementation |
| `src/lib/media/providers/index.ts` | Created | Active provider export |
| `.env.local` | Created | Secrets (gitignored) |
| `.env.local.example` | Created | Committed template |

---

## Not Changing

- Zustand store
- `RoutineData` / `ParsedExercise` types (`mediaUrl: string | null` remains)
- Markdown parser
- PWA service worker config (already caches API routes with NetworkFirst)
