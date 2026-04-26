# Routyne Handbook

This file replaces the old `CLAUDE.md` general docs. The current app status and roadmap live in [`status.md`](/Users/sierra/Code/routyne/status.md).

## Deployment

- Production URL: `https://routyne-nu.vercel.app`
- Host: Vercel Hobby tier, auto-deploys from `main`
- CI order: `pnpm lint` → `pnpm test` → `pnpm build`
- Node version: `20` from `.nvmrc`
- Production build expects `RAPIDAPI_KEY`

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `RAPIDAPI_KEY` | Always | ExerciseDB media and search |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Cloud sync and auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase client key |
| `NEXT_PUBLIC_COACH_ENABLED` | Optional | Shows the AI Coach button |
| `VERCEL_OIDC_TOKEN` | Optional | AI Gateway auth |
| `COACH_DAILY_LIMIT_FREE` | Optional | Free-tier coach limit |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Browser push public key |
| `VAPID_PUBLIC_KEY` | Optional | Server push public key |
| `VAPID_PRIVATE_KEY` | Optional | Server push private key |
| `VAPID_SUBJECT` | Optional | VAPID contact email |

Generate VAPID keys with `node scripts/generate-vapid-keys.mjs`.
Get the Vercel AI Gateway token with `vercel link && vercel env pull`.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:coverage
pnpm import:exercises
```

## Architecture

- App Router app with a single main shell in `src/app/page.tsx`
- Zustand store in `src/store/useWorkoutStore.ts` is the source of truth
- IndexedDB via `idb` is the durable data layer; Zustand is the reactive cache
- Persistence is explicit in `src/lib/db/*`; there is no Zustand persistence middleware
- Hydration is gated through `useHydration()` and store `hydrate()`

**Primary flow:** `uploader` → `routine-overview` → `active-session` → `history` | `stats`

**Important files:**
- `src/app/page.tsx` - main view orchestration
- `src/store/useWorkoutStore.ts` - store state and async actions
- `src/types/workout.ts` - shared domain types
- `src/lib/db/` - IndexedDB access modules
- `src/lib/markdown/parser.ts` - markdown to `RoutineData`
- `src/lib/media/resolver.ts` - fuzzy media resolution
- `src/app/globals.css` - design tokens and glass utilities
- `src/test/setup.ts` - Vitest global setup

## Store and Persistence Rules

- `useWorkoutStore` is the canonical app state; do not duplicate business state elsewhere
- Async store actions should update Zustand predictably and persist to IDB deliberately
- Fire-and-forget writes should use `.catch(console.error)` or equivalent logged handling
- `saveRoutine()` can be called with or without `sourceMarkdown`; when omitted it preserves the existing markdown
- `updateActiveSessionExercises()` is the store action for live session editing
- Keep IDB modules thin and functional; do not bury app logic in DB helpers

## Cloud Sync

- `src/lib/supabase/client.ts` - typed singleton Supabase client
- `src/lib/supabase/schema.sql` - DDL to run in Supabase SQL Editor
- `src/lib/sync/queue.ts` - IDB-backed mutation queue
- `src/lib/sync/merge.ts` - last-write-wins merge helpers
- `src/lib/sync/syncEngine.ts` - push/pull/profile sync
- `src/hooks/useAuth.ts` - Supabase session state
- `src/hooks/useSync.ts` - triggers sync on auth and visibility changes
- `src/components/workout/overlays/AuthSheet.tsx` - magic-link auth UI
- `src/components/workout/overlays/ProfileSheet.tsx` - sync status and profile UI

## AI Coach

- `src/lib/coach/context-builder.ts` builds the user context from history and profile
- `src/lib/coach/prompts.ts` builds the Spanish system prompt
- `src/app/api/coach/route.ts` serves the coach API via Vercel AI Gateway
- `CoachSheet` provides the chat UI
- The coach is gated by `NEXT_PUBLIC_COACH_ENABLED=true`

## Push Notifications

- `worker/push.ts` handles push events and rest-timer scheduling
- `src/lib/push/client.ts` handles browser subscription logic
- `src/app/api/push/subscribe/route.ts` stores subscriptions in memory on Hobby tier
- `src/app/api/push/notify/route.ts` sends immediate notifications
- `src/hooks/usePushNotifications.ts` manages subscription state

## Web Workers

- `src/workers/search.worker.ts` handles history search
- `src/workers/analytics.worker.ts` handles PR and weekly volume computation
- `src/hooks/useSearchWorker.ts` and `src/hooks/useAnalyticsWorker.ts` spawn the workers

## Markdown Parser

- Standard format: `* **Exercise Name**: 3x8-10 90s`
- Flipped format: `3x10 Bicep Curls`
- Supersets use `[Superset]` / `[/Superset]`
- Invalid lines are skipped instead of crashing the import flow

## Media Resolution

- `resolveExerciseMedia(name)` returns `/api/media/{slug}`
- The API route fetches from ExerciseDB with fuzzy matching and an in-process cache
- Exercise cards fall back through video, GIF, image, then dumbbell icon

## Design System

- `glass-panel`, `sunken-glass`, `active-glass-btn`, and `liquid-bg-dark` are the core utility classes
- Motion uses Framer Motion with easing `[0.23, 1, 0.32, 1]`
- Preserve the blue/liquid-glass look when extending workout UI

## Testing And Verification

- Test runner: Vitest with `jsdom`
- Keep `import 'fake-indexeddb/auto';` as the first import in `src/test/setup.ts`
- When changing persistence behavior, run the full test suite
- When touching UI, verify both mobile and desktop layouts

## TypeScript

- TypeScript is strict; do not introduce `any`
- Use semicolons, single quotes, and 2-space indentation
- Prefer named exports for internal components and libs

## Cleanup

- Delete temporary Playwright screenshots from the repo root after verification
- Keep scratch files and generated notes out of version control
