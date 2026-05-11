# Routyne Agent Context

This is the shared context file for Codex, Claude, and other repo agents.
`CLAUDE.md` is a symlink to this file; keep the content here only.

Start with the documentation index in [`docs/README.md`](/Users/sierra/Code/routyne/docs/README.md). Current shipped status and roadmap health live in [`docs/status.md`](/Users/sierra/Code/routyne/docs/status.md).

## Project Basics

- App: mobile-first Next.js PWA workout and nutrition tracker.
- Production URL: `https://routyne-nu.vercel.app`.
- Host: Vercel Hobby tier, auto-deploys from `main`.
- Runtime: Node `20` from `.nvmrc`.
- Package manager: pnpm only; `pnpm-lock.yaml` is authoritative.
- CI order: `pnpm lint`, `pnpm check:commits`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.
- Production build expects `RAPIDAPI_KEY`.

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm check:commits
pnpm tsc --noEmit
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm import:exercises
```

## Environment Variables

See [`.env.example`](/Users/sierra/Code/routyne/.env.example) and [`docs/development.md`](/Users/sierra/Code/routyne/docs/development.md) for the complete table.

High-impact variables:

- `RAPIDAPI_KEY`: required for ExerciseDB media/search and production build.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: enable auth and cloud sync.
- `SUPABASE_SERVICE_ROLE_KEY`: required for server-side push subscription storage and cron reminders.
- `NEXT_PUBLIC_COACH_ENABLED=true`: shows the AI Coach button.
- `VERCEL_OIDC_TOKEN`: required by `/api/coach` for Vercel AI Gateway.
- `NEXT_PUBLIC_NUTRITION_ENABLED=false`: disables the nutrition onboarding/profile layer; default is enabled.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: enable web push.
- `NEXT_PUBLIC_NATIVE_PUSH_ENABLED=true`: opts native installs into FCM/APNs token registration; native local alerts work without it.
- `CRON_SECRET`: protects `/api/cron/streak-reminders`.

Generate VAPID keys with `node scripts/generate-vapid-keys.mjs`.
Get the Vercel AI Gateway token with `vercel link && vercel env pull`.

## Architecture

- App Router app with a single main shell in `src/app/page.tsx`.
- Zustand store in `src/store/useWorkoutStore.ts` is the source of truth.
- IndexedDB through `idb` is the durable local data layer; Zustand is the reactive cache.
- Persistence is explicit in `src/lib/db/*`; there is no Zustand persistence middleware.
- Hydration is gated through `useHydration()` and store `hydrate()`.
- Main shell views: `uploader`, `routine-builder`, `routine-manager`, `routine-overview`, `active-session`, `workout-summary`, `history`, `nutrition`, and `stats`.

Important files:

- `src/app/page.tsx`: main view orchestration.
- `src/store/useWorkoutStore.ts`: store state and async actions.
- `src/types/workout.ts`: shared workout/domain types.
- `src/types/nutrition.ts`: nutrition profile and plan types.
- `src/lib/db/`: IndexedDB access modules.
- `src/lib/sync/syncEngine.ts`: high-level Supabase sync flow.
- `src/lib/markdown/parser.ts`: markdown to `RoutineData`.
- `src/lib/media/resolver.ts`: fuzzy media resolution.
- `src/app/globals.css`: design tokens and glass utilities.
- `src/test/setup.ts`: Vitest global setup.

## Store And Persistence Rules

- `useWorkoutStore` is the canonical app state; do not duplicate business state elsewhere.
- Async store actions should update Zustand predictably and persist to IDB deliberately.
- Fire-and-forget writes should use `.catch(console.error)` or equivalent logged handling.
- `saveRoutine()` can be called with or without `sourceMarkdown`; when omitted it preserves existing markdown.
- `updateActiveSessionExercises()` is the store action for live session editing.
- Keep IDB modules thin and functional; do not bury app logic in DB helpers.
- When changing persistence behavior, run the full test suite.

## Cloud Sync

- `src/lib/supabase/client.ts`: typed singleton Supabase client. Browser code uses `@supabase/ssr` `createBrowserClient` so OAuth callbacks can finish with cookie-backed PKCE state.
- `src/lib/supabase/schema.sql`: DDL to run in the Supabase SQL Editor.
- `src/lib/sync/queue.ts`: IDB-backed mutation queue.
- `src/lib/sync/merge.ts`: last-write-wins merge helpers.
- `src/lib/sync/syncEngine.ts`: queued push, remote pull, first-device full pull, local bootstrap, and profile/history/bodyweight/routine/nutrition-profile sync.
- `src/lib/sync/debug.ts`: in-browser trace recorder exposed as `window.__routyneSync`.
- `src/app/auth/callback/route.ts`: server auth callback for OAuth/magic-link redirects.
- `src/lib/site.ts`: canonical site URL and auth redirect helpers.
- `src/hooks/useAuth.ts`: Supabase session state.
- `src/hooks/useSync.ts`: triggers sync on auth and visibility changes.
- `src/components/workout/overlays/AccountSheet.tsx`: auth, sync status, debug tools, profile, and local backup UI.

`syncCloudData(userId)` is the high-level sync entry point. On the first authenticated sync for a device, it ignores the shared remote cursor, pulls all remote rows, drains queued mutations, seeds local profile/history/bodyweight/routines/nutrition profile to Supabase, updates the cursor, and marks `cloud-sync-initialized:{userId}` in IDB meta.

## Nutrition

- `NEXT_PUBLIC_NUTRITION_ENABLED` defaults on.
- `/onboarding` captures the rich nutrition profile for authenticated users unless they complete, defer, or disable nutrition.
- Rich nutrition profile data is stored in IDB `meta` through `src/lib/db/nutritionProfile.ts` to avoid an IDB version bump.
- The rich profile syncs to Supabase `nutrition_profiles`.
- The nutrition tab still uses the legacy local daily entry/goal stores for manual food logging.
- `src/lib/nutrition/calculations.ts` contains the BMR/TDEE/macro/meal-plan engine.
- `src/lib/nutrition/planner.ts` contains the block planner for cut/gain/recomp targets.
- `src/lib/nutrition/adaptive.ts` and `src/hooks/useAdaptiveCheck.ts` compute pending kcal adjustments from bodyweight trends.
- `src/components/nutrition/AdjustmentBanner.tsx` applies or rejects pending adjustments.

See [`docs/nutrition.md`](/Users/sierra/Code/routyne/docs/nutrition.md) before changing this area.

## AI Coach

- `src/lib/coach/context-builder.ts` builds the user context from local state; do not query Supabase from the coach path.
- `src/lib/coach/prompts.ts` builds the system prompt.
- `src/app/api/coach/route.ts` serves the coach through Vercel AI Gateway with an in-memory daily limit.
- `src/components/workout/overlays/CoachSheet.tsx` provides the chat UI.
- The coach is gated by `NEXT_PUBLIC_COACH_ENABLED=true`.
- Current coach context includes workout history, profile, weekly muscle volume, PRs, streak, and the saved legacy nutrition goal. It does not yet include the full rich nutrition onboarding profile or pending adaptive adjustment as structured context.

## Push Notifications

- Native app installs use local notifications first; do not require Firebase for activation.
- Native remote push token registration is opt-in through `NEXT_PUBLIC_NATIVE_PUSH_ENABLED=true`.
- `src/lib/notifications/provider.ts` selects native vs web mode and owns the shared notification API.
- `src/lib/notifications/native.ts` handles Capacitor local notifications, Android channels, permissions, and optional native push registration.
- `worker/push.ts` handles service worker push events and rest-timer scheduling.
- `src/lib/push/client.ts` handles browser subscription logic.
- `src/lib/push/subscriptions.ts` is the local in-memory fallback.
- `src/lib/push/server.ts` owns Supabase-backed subscription storage.
- `src/app/api/push/subscribe/route.ts` stores/removes subscriptions.
- `src/app/api/push/notify/route.ts` sends immediate notifications.
- `src/app/api/cron/streak-reminders/route.ts` sends daily streak reminders from Vercel Cron.
- `src/hooks/usePushNotifications.ts` manages subscription state.

## Web Workers

- `src/workers/search.worker.ts` handles history search.
- `src/workers/analytics.worker.ts` handles PR and weekly volume computation.
- `src/hooks/useSearchWorker.ts` and `src/hooks/useAnalyticsWorker.ts` spawn the workers.

## Markdown Parser

- Standard format: `* **Exercise Name**: 3x8-10 90s`.
- Flipped format: `3x10 Bicep Curls`.
- Supersets use `[Superset]` and `[/Superset]`.
- Invalid lines are skipped instead of crashing import.

## Media Resolution

- `resolveExerciseMedia(name)` returns `/api/media/{slug}`.
- The API route fetches from ExerciseDB with fuzzy matching and in-process caching.
- Exercise cards fall back through video, GIF, image, then dumbbell icon.
- The exercise library currently has slim and raw ExerciseDB JSON fixtures in `src/lib/data/`.

## Design System

- `glass-panel`, `sunken-glass`, `active-glass-btn`, and `liquid-bg-dark` are core utility classes.
- Motion uses Framer Motion with easing `[0.23, 1, 0.32, 1]`.
- Preserve the blue/liquid-glass look when extending workout UI.
- When touching UI, verify both mobile and desktop layouts.

## Testing And Verification

- Test runner: Vitest with `jsdom`.
- Keep `import 'fake-indexeddb/auto';` as the first import in `src/test/setup.ts`.
- Use `pnpm test` for persistence/sync changes.
- Use `pnpm test:e2e` for shell, onboarding, import/export, or browser-flow changes.
- CI also runs `pnpm check:commits` and `pnpm tsc --noEmit`.

## TypeScript

- TypeScript is strict; do not introduce `any`.
- Use semicolons, single quotes, and 2-space indentation.
- Prefer named exports for internal components and libs.

## Documentation And Cleanup

- Keep important project documents under `docs/`.
- Do not add duplicate agent context files. Update `AGENTS.md`; keep `CLAUDE.md` pointing to it.
- Delete stale handoff notes, scratch docs, temporary screenshots, and generated notes once the information is captured in canonical docs.
- Keep ignored tool caches such as `.opencode/`, `.playwright-mcp/`, and generated screenshots out of version control.
