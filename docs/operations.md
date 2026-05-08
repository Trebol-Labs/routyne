# Operations

## Deployment

- Production URL: `https://routyne-nu.vercel.app`.
- Host: Vercel Hobby tier.
- Source branch: `main`.
- Vercel build command: `pnpm build`.
- Install command: `pnpm install --frozen-lockfile`.
- Node version: `.nvmrc` (`20`).
- Required production environment: `RAPIDAPI_KEY`.

Vercel config lives in [`vercel.json`](/Users/sierra/Code/routyne/vercel.json).

## CI

CI workflow: [`.github/workflows/ci.yml`](/Users/sierra/Code/routyne/.github/workflows/ci.yml).

Order:

1. `pnpm lint`
2. `pnpm check:commits`
3. `pnpm tsc --noEmit`
4. `pnpm test`
5. `pnpm build`
6. `pnpm test:e2e`

The build step mirrors the production env surface with optional values empty for deterministic CI.

## Supabase

Schema source: [`src/lib/supabase/schema.sql`](/Users/sierra/Code/routyne/src/lib/supabase/schema.sql).

Client:

- Browser: `createBrowserClient` from `@supabase/ssr` for cookie-backed PKCE state.
- Server/tests/scripts: plain `createClient` fallback.

Synced app data:

- Profiles
- History
- Bodyweight
- Routines
- Rich nutrition profile
- Push subscriptions
- Sync cursors

Run the current schema SQL in the Supabase SQL Editor after schema changes. The sync engine has compatibility fallbacks for older bodyweight/profile schemas and skips `nutrition_profiles` if the table is missing.

## Auth Redirects

- Browser auth redirects use the current origin.
- Server-side fallback comes from `NEXT_PUBLIC_SITE_URL`.
- OAuth/magic-link callbacks return to `/auth/callback`.
- The main app reopens the account sync panel when the callback redirects with `?account=sync`.

## Sync Debugging

Every `syncCloudData(userId)` call creates a structured trace through [`src/lib/sync/debug.ts`](/Users/sierra/Code/routyne/src/lib/sync/debug.ts).

In DevTools:

```js
window.__routyneSync.last
window.__routyneSync.traces
window.__routyneSync.dump()
```

Use traces to inspect auth mismatch, bootstrap, push, pull, merge counts, cursor movement, and fatal errors.

## Push And Cron

Push setup:

- Generate keys with `node scripts/generate-vapid-keys.mjs`.
- Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
- Set `SUPABASE_SERVICE_ROLE_KEY` for production subscription storage.
- `pnpm dev` disables the generated PWA service worker through `next-pwa`; test real Web Push with a production build and `pnpm start`.
- If `SUPABASE_SERVICE_ROLE_KEY` is missing, `/api/push/subscribe` falls back to the in-memory map, so local browser activation can still succeed without a signed-in session.

Routes:

- `POST /api/push/subscribe`: subscribe current authenticated user when Supabase service credentials exist; local fallback stores in memory.
- `DELETE /api/push/subscribe`: remove a subscription.
- `POST /api/push/notify`: immediate notification.
- `GET /api/cron/streak-reminders`: daily streak reminders, protected by `CRON_SECRET`.

Vercel Cron schedule in `vercel.json`: `0 1 * * *`.

## ExerciseDB Media

- `RAPIDAPI_KEY` is required for media/search.
- `pnpm import:exercises` imports ExerciseDB rows into `src/lib/data/`.
- `src/lib/media/resolver.ts` and `/api/media/[slug]` use fuzzy matching and provider fallbacks.
- API cache headers are stricter in development and long-lived in production.

## Local Backup Tools

- Local backup import/export lives in `AccountSheet`.
- Production hides local backup tools unless `NEXT_PUBLIC_LOCAL_BACKUP_TOOLS=true`.
- `NEXT_PUBLIC_LOCAL_ONLY=true` forces local-only account UI mode.

## Cleanup

Keep these out of version control:

- Temporary Playwright screenshots.
- `.playwright-mcp/`.
- `.opencode/` and other local tool caches.
- Generated handoff notes after their useful content is moved into canonical docs.
- `.vercel/` project link metadata.

Do not delete `.vercel/project.json` unless intentionally unlinking the local Vercel project.
