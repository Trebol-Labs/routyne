# Development

## Requirements

- Node `20` from [`.nvmrc`](/Users/sierra/Code/routyne/.nvmrc).
- pnpm from `packageManager` in [`package.json`](/Users/sierra/Code/routyne/package.json).
- `RAPIDAPI_KEY` for ExerciseDB-backed media/search and production builds.

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm lint` | Run ESLint. |
| `pnpm check:commits` | Check conventional commit messages in CI context. |
| `pnpm tsc --noEmit` | Run TypeScript typecheck. |
| `pnpm test` | Run Vitest unit tests. |
| `pnpm test:coverage` | Run Vitest with coverage. |
| `pnpm build` | Build the production app. |
| `pnpm test:e2e` | Run Playwright smoke tests. |
| `pnpm import:exercises` | Import ExerciseDB data into `src/lib/data/`. |

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `RAPIDAPI_KEY` | Production | ExerciseDB media lookup, exercise search, and import script. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Canonical links, OG metadata, server-side auth redirect fallback. Defaults to production URL. |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Enables Supabase auth and cloud sync. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Browser Supabase client key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-side push subscription storage and streak reminder cron. |
| `NEXT_PUBLIC_COACH_ENABLED` | Optional | Shows the AI Coach button when `true`. |
| `VERCEL_OIDC_TOKEN` | Optional | Required by `/api/coach` for Vercel AI Gateway. |
| `COACH_DAILY_LIMIT_FREE` | Optional | In-memory daily coach request limit. Defaults to `5`. |
| `NEXT_PUBLIC_NUTRITION_ENABLED` | Optional | Rich nutrition onboarding/profile flag. Defaults on; set `false` to disable. |
| `NEXT_PUBLIC_LOCAL_BACKUP_TOOLS` | Optional | Shows local backup import/export in production when `true`. |
| `NEXT_PUBLIC_LOCAL_ONLY` | Optional | Forces local-only account UI mode when `true`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Browser push public key. |
| `VAPID_PUBLIC_KEY` | Optional | Server push public key. Should match `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. |
| `VAPID_PRIVATE_KEY` | Optional | Server push private key. |
| `VAPID_SUBJECT` | Optional | VAPID contact, for example `mailto:admin@example.com`. |
| `CRON_SECRET` | Optional | Bearer token for `/api/cron/streak-reminders`. |

Generate VAPID keys:

```bash
node scripts/generate-vapid-keys.mjs
```

Pull Vercel-linked environment:

```bash
vercel link
vercel env pull
```

## Verification Matrix

- Persistence, sync, store, or IDB changes: run `pnpm test`.
- Type or API surface changes: run `pnpm tsc --noEmit`.
- UI flow changes: run `pnpm test:e2e` and manually check mobile and desktop layouts.
- Production readiness: run `pnpm lint`, `pnpm check:commits`, `pnpm tsc --noEmit`, `pnpm test`, and `pnpm build`.

## Testing Notes

- Test runner: Vitest with `jsdom`.
- Keep `import 'fake-indexeddb/auto';` as the first import in `src/test/setup.ts`.
- E2E tests live in `e2e/` and use Playwright.
- Delete temporary Playwright screenshots from the repo root after verification.
