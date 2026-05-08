# Architecture

## App Shell

Routyne is a Next.js App Router PWA with one main client shell in [`src/app/page.tsx`](/Users/sierra/Code/routyne/src/app/page.tsx). The shell hydrates local state, applies appearance/language preferences, starts auth/sync hooks, and renders the current workout view.

Main views:

- `uploader`
- `routine-builder`
- `routine-manager`
- `routine-overview`
- `active-session`
- `workout-summary`
- `history`
- `nutrition`
- `stats`

Standalone pages include `/landing`, `/privacy`, `/terms`, `/support`, `/onboarding`, and `/auth/callback`.

## State And Persistence

- [`src/store/useWorkoutStore.ts`](/Users/sierra/Code/routyne/src/store/useWorkoutStore.ts) is the canonical app state.
- IndexedDB is the durable local layer through modules in [`src/lib/db/`](/Users/sierra/Code/routyne/src/lib/db).
- Zustand is a reactive cache over IDB; there is no Zustand persistence middleware.
- Hydration is gated by [`src/hooks/useHydration.ts`](/Users/sierra/Code/routyne/src/hooks/useHydration.ts).
- Store actions persist deliberately and enqueue sync mutations only where the app needs cloud propagation.

Important IDB modules:

- `profile.ts`: user profile and preferences.
- `routines.ts`: routine library and source markdown.
- `history.ts`: completed workout sessions.
- `bodyweight.ts`: bodyweight records, keyed by date for sync dedupe.
- `activeSession.ts`: in-progress workout session.
- `nutrition.ts`: legacy daily nutrition entries and manual macro goals.
- `nutritionProfile.ts`: rich onboarding nutrition profile stored in `meta`.
- `nutritionAdjustment.ts`: pending adaptive kcal adjustment and cooldown metadata.
- `queue.ts`: sync mutation queue.
- `meta.ts`: small key/value metadata.

## Cloud Sync

Supabase sync is optional and starts when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist.

Core files:

- [`src/lib/supabase/client.ts`](/Users/sierra/Code/routyne/src/lib/supabase/client.ts): typed client singleton.
- [`src/lib/supabase/schema.sql`](/Users/sierra/Code/routyne/src/lib/supabase/schema.sql): Supabase DDL.
- [`src/lib/sync/queue.ts`](/Users/sierra/Code/routyne/src/lib/sync/queue.ts): local mutation queue.
- [`src/lib/sync/merge.ts`](/Users/sierra/Code/routyne/src/lib/sync/merge.ts): last-write-wins merge helpers.
- [`src/lib/sync/syncEngine.ts`](/Users/sierra/Code/routyne/src/lib/sync/syncEngine.ts): push/pull orchestration.
- [`src/lib/sync/debug.ts`](/Users/sierra/Code/routyne/src/lib/sync/debug.ts): structured sync traces.

`syncCloudData(userId)` dedupes concurrent runs per user. First-device sync ignores the remote cursor, pulls all remote rows, drains queued mutations, seeds the local snapshot to cloud, advances the cursor, and marks `cloud-sync-initialized:{userId}` in IDB meta. Incremental sync pushes the queue, then pulls records newer than the cursor.

Synced tables:

- `profiles`
- `history`
- `bodyweight`
- `routines`
- `nutrition_profiles`
- `push_subscriptions` through server-side push helpers
- `sync_cursors`

The daily nutrition entries/goals from `src/lib/db/nutrition.ts` are local-only today.

## Auth

- [`src/hooks/useAuth.ts`](/Users/sierra/Code/routyne/src/hooks/useAuth.ts) tracks Supabase session state.
- [`src/app/auth/callback/route.ts`](/Users/sierra/Code/routyne/src/app/auth/callback/route.ts) handles OAuth/magic-link callbacks.
- Browser Supabase auth uses `createBrowserClient` from `@supabase/ssr` so PKCE state is cookie-backed and the server callback can finish `exchangeCodeForSession`.
- [`src/lib/site.ts`](/Users/sierra/Code/routyne/src/lib/site.ts) builds canonical URLs and auth redirect targets.

## Nutrition

Routyne currently has two nutrition layers:

- Legacy daily logging and macro goals in `nutritionEntries` and `nutritionGoals`.
- Rich onboarding profile, calculations, planner, and adaptive kcal adjustment stored through `meta` and synced through `nutrition_profiles`.

See [`nutrition.md`](/Users/sierra/Code/routyne/docs/nutrition.md) for details.

## AI Coach

- [`src/lib/coach/context-builder.ts`](/Users/sierra/Code/routyne/src/lib/coach/context-builder.ts) builds local context from store state.
- [`src/lib/coach/prompts.ts`](/Users/sierra/Code/routyne/src/lib/coach/prompts.ts) builds the system prompt.
- [`src/app/api/coach/route.ts`](/Users/sierra/Code/routyne/src/app/api/coach/route.ts) calls Vercel AI Gateway and applies an in-memory daily limit.
- [`src/components/workout/overlays/CoachSheet.tsx`](/Users/sierra/Code/routyne/src/components/workout/overlays/CoachSheet.tsx) provides the UI.

The coach never queries Supabase directly. Current context includes workout history, profile, PRs, weekly muscle volume, streak, total workouts, and the saved legacy nutrition goal.

## Push Notifications

- [`worker/push.ts`](/Users/sierra/Code/routyne/worker/push.ts): service worker push/rest timer behavior.
- [`src/lib/push/client.ts`](/Users/sierra/Code/routyne/src/lib/push/client.ts): browser subscription logic.
- [`src/lib/push/subscriptions.ts`](/Users/sierra/Code/routyne/src/lib/push/subscriptions.ts): in-memory local fallback.
- [`src/lib/push/server.ts`](/Users/sierra/Code/routyne/src/lib/push/server.ts): Supabase service-role storage helpers.
- [`src/app/api/push/subscribe/route.ts`](/Users/sierra/Code/routyne/src/app/api/push/subscribe/route.ts): subscribe/unsubscribe API.
- [`src/app/api/push/notify/route.ts`](/Users/sierra/Code/routyne/src/app/api/push/notify/route.ts): immediate push API.
- [`src/app/api/cron/streak-reminders/route.ts`](/Users/sierra/Code/routyne/src/app/api/cron/streak-reminders/route.ts): protected daily reminder cron.

## Workers

- [`src/workers/search.worker.ts`](/Users/sierra/Code/routyne/src/workers/search.worker.ts): history search.
- [`src/workers/analytics.worker.ts`](/Users/sierra/Code/routyne/src/workers/analytics.worker.ts): PR and weekly volume computation.
- [`src/hooks/useSearchWorker.ts`](/Users/sierra/Code/routyne/src/hooks/useSearchWorker.ts) and [`src/hooks/useAnalyticsWorker.ts`](/Users/sierra/Code/routyne/src/hooks/useAnalyticsWorker.ts): worker hooks.

## Markdown Parser

The parser in [`src/lib/markdown/parser.ts`](/Users/sierra/Code/routyne/src/lib/markdown/parser.ts) supports:

- Standard format: `* **Exercise Name**: 3x8-10 90s`.
- Flipped format: `3x10 Bicep Curls`.
- Supersets with `[Superset]` and `[/Superset]`.
- Invalid-line skipping instead of crashing import.

Generated markdown comes from [`src/lib/markdown/generator.ts`](/Users/sierra/Code/routyne/src/lib/markdown/generator.ts).

## Media

- [`src/lib/media/resolver.ts`](/Users/sierra/Code/routyne/src/lib/media/resolver.ts) maps exercise names to `/api/media/{slug}`.
- [`src/app/api/media/[slug]/route.ts`](/Users/sierra/Code/routyne/src/app/api/media/[slug]/route.ts) resolves/fetches media from provider data.
- [`src/lib/media/providers/exercisedb.ts`](/Users/sierra/Code/routyne/src/lib/media/providers/exercisedb.ts) uses RapidAPI ExerciseDB.
- Exercise card fallback order is video, GIF, image, dumbbell icon.

## I18n And Design

- Translations live in [`src/lib/i18n/translations.ts`](/Users/sierra/Code/routyne/src/lib/i18n/translations.ts).
- Language preference is stored in the user profile and mirrored to a cookie for standalone pages.
- Core visual utilities are `glass-panel`, `sunken-glass`, `active-glass-btn`, and `liquid-bg-dark`.
- Motion uses Framer Motion easing `[0.23, 1, 0.32, 1]`.
- Preserve the blue/liquid-glass identity when extending workout UI.
