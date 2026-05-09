# Development

## Requirements

- Node `20` from [`.nvmrc`](/Users/sierra/Code/routyne/.nvmrc).
- pnpm from `packageManager` in [`package.json`](/Users/sierra/Code/routyne/package.json).
- `RAPIDAPI_KEY` for ExerciseDB-backed media/search and production builds.
- Android Studio + a Java 21 JDK for the native shell. Android Studio's bundled JBR 21 also works.

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

If you are testing the Capacitor shell on a real Android phone, keep `pnpm dev` running and set `CAPACITOR_SERVER_URL` to a LAN-reachable URL such as `http://192.168.1.20:3000` before running `pnpm cap:sync`. The native shell defaults to `NEXT_PUBLIC_SITE_URL` when `CAPACITOR_SERVER_URL` is unset.

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
| `pnpm cap:sync` | Sync the web build and plugin config into the native Capacitor projects. |
| `pnpm import:exercises` | Import ExerciseDB data into `src/lib/data/`. |

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `RAPIDAPI_KEY` | Production | ExerciseDB media lookup, exercise search, and import script. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Canonical links, OG metadata, server-side auth redirect fallback. Defaults to production URL. |
| `CAPACITOR_SERVER_URL` | Optional | URL loaded by the Capacitor shell. Defaults to `NEXT_PUBLIC_SITE_URL`; use a LAN-reachable dev URL for on-device testing. |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Enables Supabase auth and cloud sync. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Browser Supabase client key. |
| `HEVY_API_KEY` | Optional | Required by the Hevy migration route to pull the archive once and store it in Supabase. |
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

## Native Shell

- Native app id and bundle id: `com.trebollabs.routyne`.
- Deep-link scheme for auth and notification taps: `com.trebollabs.routyne://auth/callback`.
- Use `pnpm cap:sync` after changing web assets, Capacitor config, or notification assets.
- Use `pnpm exec cap open android` to open the generated Android project in Android Studio.
- Install `android/app/google-services.json` before testing native push registration.
- If `./gradlew assembleDebug` fails with `invalid source release: 21`, run it with Android Studio's bundled JDK 21:

  ```bash
  JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin:$PATH" \
  ./gradlew assembleDebug
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
