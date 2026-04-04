# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context7

Always use the **Context7 MCP** (`resolve-library-id` → `query-docs`) when the task involves:
- Library or API documentation lookups
- Code generation using third-party APIs or frameworks
- Setup or configuration steps for any dependency

Do this proactively — do not wait for the user to ask.

## Deployment

- **Production URL**: https://routyne-nu.vercel.app
- **Host**: Vercel Hobby tier (free) — auto-deploys from `main` via GitHub integration
- **CI**: `.github/workflows/ci.yml` — lint + test + build on every push/PR
- **Env vars**: see `.env.example` — `RAPIDAPI_KEY` always required; others are optional feature gates
- **PWA install (Android)**: open production URL in Chrome → ⋮ menu → "Add to Home Screen"
- **Preview deploys**: every PR gets a unique `*.vercel.app` URL automatically
- **SW build artifacts** (`public/sw.js`, `workbox-*.js`, `public/worker-*.js`) are gitignored — regenerated on each build
- **Node version**: pinned to 20 via `.nvmrc` (read by Vercel and GitHub Actions)

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `RAPIDAPI_KEY` | ✅ Always | ExerciseDB media (GIFs, exercise search) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Enables cloud sync + auth features |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anonymous client key |
| `NEXT_PUBLIC_COACH_ENABLED` | Optional | Shows AI Coach button in UI (`=true`) |
| `VERCEL_OIDC_TOKEN` | Optional | AI Gateway auth — run `vercel env pull` |
| `COACH_DAILY_LIMIT_FREE` | Optional | Free tier rate limit, default `5` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Push notification public key (browser) |
| `VAPID_PUBLIC_KEY` | Optional | Push notification public key (server) |
| `VAPID_PRIVATE_KEY` | Optional | Push notification private key (server) |
| `VAPID_SUBJECT` | Optional | VAPID contact email (`mailto:...`) |

Generate VAPID keys: `node scripts/generate-vapid-keys.mjs`
Get AI Gateway token: `vercel link && vercel env pull`

## Commands

```bash
npm run dev            # Start dev server (PWA disabled in dev)
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Run all tests with Vitest
npm run test:coverage  # Coverage report (v8 provider)
```

Run a single test file:
```bash
npx vitest run src/lib/markdown/parser.test.ts
```

## Architecture

**Routyne** is a mobile-first PWA workout tracker. Next.js 16 App Router with a single-page feel — all views render in `src/app/page.tsx` via a Zustand view state machine.

### View State Machine

Navigation is driven by `currentView` in the Zustand store (`src/store/useWorkoutStore.ts`):

```
uploader → routine-overview → active-session → workout-summary → history
routine-builder → routine-overview (via importRoutine)
routine-manager  (Library icon in bottom nav when routine active)
stats            (bottom nav)
```

Views are extracted into standalone components under `src/components/workout/views/`.

### Data Flow

1. User uploads a `.md` file → `RoutineUploader` reads it → `parseRoutine()` converts it to `RoutineData`
2. `RoutineData` is stored in Zustand (`setCurrentRoutine`), which transitions to `routine-overview`
3. During an active session, set completions are tracked as `Record<"sessionIdx-exerciseId-setIdx", SetStatus>`
4. `finishSession()` writes a `HistoryEntry` (with volume tracking per exercise), builds `WorkoutSummary`, enqueues cloud sync mutation, transitions to `workout-summary`

### Persistence

`idb` v8 + Zustand hybrid — IndexedDB as durable source of truth, Zustand as reactive in-memory cache. No `persist` middleware.

| IndexedDB Store | Purpose |
|----------------|---------|
| `routines` | Routine library (multiple saved routines) |
| `sessions` | Normalized sessions within routines |
| `exercises` | Normalized exercises within sessions |
| `history` | Completed workouts with per-set detail |
| `activeSession` | In-progress workout state (survives refresh/crash) |
| `profile` | User preferences (name, unit, rest default) |
| `meta` | Schema version flags, migration state |
| `bodyweight` | Body weight log entries |
| `achievements` | Unlocked achievement IDs |
| `syncQueue` | Pending cloud mutations (drained by useSync) |

Key patterns:
- `toggleSetCompletion` — sync Zustand update + fire-and-forget IDB write
- `finishSession()` — awaits IDB writes, then enqueues sync mutation if Supabase configured
- `importRoutine(routine, sourceMarkdown)` — sync Zustand + background `saveRoutine()`
- `hydrate()` — explicit, called once by `useHydration()` hook; `page.tsx` gates render behind `isReady`
- Legacy migration: one-time idempotent (`migrateLegacyData()`), reads `routyne-storage` → IDB → deletes LS key
- Cursor-based pagination for history via `loadMoreHistory()` + `historyHasMore` flag

### Cloud Sync (optional — Supabase)

Architecture: IDB is always local source of truth. Supabase is eventually consistent remote copy.

- `src/lib/supabase/client.ts` — typed singleton Supabase client
- `src/lib/supabase/schema.sql` — DDL to run in Supabase SQL Editor
- `src/lib/sync/queue.ts` — IDB-backed mutation queue (enqueue/dequeue/prune)
- `src/lib/sync/merge.ts` — last-write-wins by `completed_at`, `historyEntryToRemote`
- `src/lib/sync/syncEngine.ts` — `pushToCloud`, `pullFromCloud`, `pushProfileToCloud`
- `src/hooks/useAuth.ts` — Supabase session state
- `src/hooks/useSync.ts` — triggers on auth/visibilitychange, polls every 30s
- `TopHeader` — cloud icon: idle/syncing/synced/offline/error + pending badge
- `AuthSheet` — magic-link email auth (3-step flow)
- `ProfileSheet` — sync status row with "Gestionar/Activar" button

**One-time DB setup:** run `src/lib/supabase/schema.sql` in Supabase SQL Editor.
Add missing column: `alter table public.history add column if not exists deleted_at timestamptz;`

### AI Coach (optional — Vercel AI Gateway)

- `src/lib/coach/context-builder.ts` — `buildUserContext(history, profile)` → `UserCoachContext`
- `src/lib/coach/prompts.ts` — `buildSystemPrompt(ctx)` → Spanish system prompt with real data
- `src/app/api/coach/route.ts` — POST; model `'anthropic/claude-haiku-4.5'` via AI Gateway; in-memory rate limiter 5/day/IP; requires `VERCEL_OIDC_TOKEN`
- `CoachSheet` — chat UI with suggestions, typing indicator, basic markdown rendering
- Accessible from bottom nav Bot icon + WorkoutSummaryView "Ask AI Coach" button
- Gated by `NEXT_PUBLIC_COACH_ENABLED=true`

### Push Notifications (optional — VAPID)

- `worker/push.ts` — SW push handler (injected via `@ducanh2912/next-pwa` `customWorkerSrc`)
  - Handles `push` event (server-sent notifications)
  - Handles `notificationclick` (focus/open window)
  - Handles `SCHEDULE_NOTIFICATION` message — rest-timer alerts without server round-trip
- `src/lib/push/client.ts` — `subscribeToPush`, `registerSubscription`, `unsubscribeFromPush`, `isPushActive`
- `src/app/api/push/subscribe/route.ts` — stores push subscriptions in memory (Hobby tier)
- `src/app/api/push/notify/route.ts` — sends immediate push to all subscribers
- `src/hooks/usePushNotifications.ts` — state: idle/active/denied/unsupported; `enable`, `disable`, `scheduleLocal`
- `worker/` is excluded from main `tsconfig.json` (uses SW globals, bundled separately)

### Web Workers

- `src/workers/search.worker.ts` — Fuse.js history fuzzy search; `INIT` / `SEARCH` messages
- `src/workers/analytics.worker.ts` — PRs + 8-week volume trends; `COMPUTE` message
- `src/hooks/useSearchWorker.ts` — spawns worker, re-indexes when history changes
- `src/hooks/useAnalyticsWorker.ts` — spawns worker, recomputes when history changes
- Pattern: `new Worker(new URL('../workers/x.worker.ts', import.meta.url), { type: 'module' })`
- Hooks exist but not yet wired into `SearchSheet` / `PersonalRecordsTable` (optional Phase D optimization)

### Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | View orchestrator + header + bottom nav + overlay sheets |
| `src/store/useWorkoutStore.ts` | Zustand store — single source of truth for UI + data cache |
| `src/types/workout.ts` | All shared TypeScript interfaces |
| `src/lib/markdown/parser.ts` | Markdown → `RoutineData` parser |
| `src/lib/markdown/generator.ts` | `RoutineData` → Markdown (round-trip safe) |
| `src/lib/media/resolver.ts` | Resolves exercise names to `/api/media/{slug}` URLs |
| `src/lib/data/exercises.json` | Exercise library (99 entries) with aliases + media IDs |
| `src/lib/data/programs/index.ts` | 5 built-in program templates |
| `src/lib/progression/engine.ts` | 1RM estimation, linear/double/RPE progression |
| `src/lib/analytics/index.ts` | getExerciseProgressData, buildWorkoutSummary |
| `src/lib/analytics/muscle-map.ts` | Exercise → muscle group mappings + weekly volume |
| `src/lib/achievements/` | 30 badge definitions + post-session evaluator |
| `src/lib/db/schema.ts` | RoutineDB DBSchema type definitions (v4) |
| `src/lib/db/index.ts` | `getDB()` singleton, `resetDBSingleton()`, `deleteDatabase()` |
| `src/lib/supabase/client.ts` | Typed Supabase singleton |
| `src/lib/supabase/schema.sql` | Full Supabase DDL (run once) |
| `src/lib/sync/` | queue.ts, merge.ts, syncEngine.ts |
| `src/lib/coach/` | context-builder.ts, prompts.ts |
| `src/lib/push/client.ts` | Browser push subscription utilities |
| `src/workers/` | search.worker.ts, analytics.worker.ts |
| `src/hooks/useHydration.ts` | Migration + IDB hydration, returns `isReady` |
| `src/hooks/useSync.ts` | Cloud sync trigger hook |
| `src/hooks/useAuth.ts` | Supabase auth state |
| `src/hooks/usePushNotifications.ts` | Push subscription state machine |
| `src/hooks/useSearchWorker.ts` | Fuse.js search via Web Worker |
| `src/hooks/useAnalyticsWorker.ts` | Analytics computation via Web Worker |
| `src/components/workout/views/WorkoutSummaryView.tsx` | Post-workout summary, PRs, coach CTA |
| `src/components/workout/overlays/CoachSheet.tsx` | AI Coach chat UI |
| `src/components/workout/overlays/AuthSheet.tsx` | Supabase magic-link auth UI |
| `src/components/workout/overlays/ProfileSheet.tsx` | Profile + sync status + export/import |
| `src/components/workout/TopHeader.tsx` | App header — props: `onProfileClick`, optional `onCloudClick`, `syncStatus`, `pendingCount` (no search button) |
| `src/components/workout/BottomNav.tsx` | Bottom navigation with coach bot icon |
| `src/app/landing/page.tsx` | SSG marketing landing page (Spanish) |
| `src/app/globals.css` | Design tokens and Liquid Glass utility classes |
| `worker/push.ts` | Service worker push handler (bundled by next-pwa) |
| `scripts/generate-vapid-keys.mjs` | One-time VAPID key generation |
| `scripts/import-exercises.mjs` | Import exercises from ExerciseDB API |

### Stats View

`StatsView.tsx` is self-contained — level thresholds, level names, achievement category config, and chain progress map all live at the top of the file (no separate module). Three tabs: **Overview** (calendar, bodyweight, recent sessions), **Progress** (charts, PRs, muscles, recovery), **Trophies** (achievements grouped by category).

Level system: session-based tiers `[0,5,10,20,35,50,75,100,150,200,300]` → Rookie→Myth. Achievement `category` values (`sessions|volume|prs|variety|streak|special`) map 1:1 to `ACHIEVEMENT_CATEGORIES` keys — match these when adding new achievements in `definitions.ts`.

`SearchSheet` is wired inside `RoutineBuilderView`, not globally in `page.tsx`.

### Markdown Parser

`parseRoutine()` handles two exercise line formats:
- **Standard**: `* **Exercise Name**: 3x8-10 90s`
- **Flipped**: `3x10 Bicep Curls`
- **Superset**: wrap exercises in `[Superset]` / `[/Superset]` blocks

Sessions are delimited by `##` headings; the overall routine title is the `#` heading. Default rest is 90s if not specified. Invalid lines (NaN sets/reps) are silently skipped.

### Media Resolution

`resolveExerciseMedia(name)` uses Fuse.js fuzzy search (threshold 0.3) against `exercises.json` aliases. Returns `/api/media/{slug}` URL. The API route fetches from ExerciseDB (RapidAPI) with in-memory caching. ExerciseCard handles the cascade: video → GIF → image → dumbbell fallback.

### Design System

The "Liquid Glass" aesthetic is implemented via utility classes in `globals.css`:
- `.glass-panel` — frosted glass card (blur 40px, saturate 180%)
- `.active-glass-btn` — blue/indigo gradient button
- `.liquid-bg-dark` — `background: transparent` (gradients now live on `html` in `globals.css` with `background-attachment: fixed` — do not add background colors to this class)
- `.text-liquid` — gradient clip text
- `.sunken-glass` — inset shadow panel

Design tokens are CSS variables defined in the `@theme` block. All animations use Framer Motion with cubic-bezier `[0.23, 1, 0.32, 1]` for organic feel.

### PWA

Configured via `@ducanh2912/next-pwa` in `next.config.ts`. PWA is disabled in development. Service worker output goes to `public/`. Custom worker code in `worker/` is bundled and injected via `importScripts`. The React Compiler (`reactCompiler: true`) and Turbopack are both enabled.

### Path Alias

`@/` maps to `src/` (configured in both `tsconfig.json` and `vitest.config.ts`).

### IndexedDB Testing (fake-indexeddb)

**Critical**: `src/test/setup.ts` must `import 'fake-indexeddb/auto'` as the **first import**. This patches ALL required globals: `IDBRequest`, `IDBKeyRange`, `IDBCursor`, `IDBTransaction`, etc. Using only `new IDBFactory()` from `fake-indexeddb` patches `indexedDB` alone — the `idb` library will throw `ReferenceError: IDBRequest is not defined`.

Per-test isolation pattern:
- `setup.ts` `beforeEach`: `resetDBSingleton()` + `vi.stubGlobal('indexedDB', new IDBFactory())`
- `db.test.ts`: `deleteDatabase()` in `beforeEach`, `resetDBSingleton()` in `afterEach`
- Persist tests: `vi.resetModules()` + `resetDBSingleton()` + fresh `IDBFactory` per test

### TypeScript

`npx tsc --noEmit` should report **zero errors**. All test-file type errors were fixed 2026-04-04:
- `route.test.ts` uses `NextRequest` (not bare `Request`)
- `ErrorBoundary.test.tsx` types covered by `@testing-library/jest-dom` entry in `tsconfig.json` `types`
- `db.test.ts` fixture includes `restDays: []`

### Playwright Testing Cleanup

After any Playwright browser session, delete all `.png` files from the project root before finishing:
```bash
rm -f /Users/sierra/Code/routyne/*.png
```

### Plans

All implementation plans live in `.claude/plans/` (gitignored via `.claude/`).

Current plans:
- `roadmap.md` — full product roadmap with phase completion status
- `phase-a-foundation.md` — A1 (exercise library 500+), A2 (storage.persist), A3/A4 mostly done
- `phase-d-growth.md` — share cards v2, challenges, referral, app store
- `phase-e-monetization.md` — Stripe, subscription gate, pro themes, analytics
