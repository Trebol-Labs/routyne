# Routyne

Routyne is a mobile-first Next.js PWA workout tracker. It stores workouts locally in IndexedDB, syncs profile, history, bodyweight, and routines to Supabase when configured, and includes stats, share cards, push notifications, a bilingual `es`/`en` UI, history session detail views, and an optional AI coach.

## Docs

- Current app status and roadmap: [`status.md`](/Users/sierra/Code/routyne/status.md)
- General project handbook: [`agents.md`](/Users/sierra/Code/routyne/agents.md)

## Getting Started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Environment

`RAPIDAPI_KEY` is required for ExerciseDB media lookup.

Optional feature flags and integrations:

- `NEXT_PUBLIC_SITE_URL` (defaults to `https://routyne-nu.vercel.app`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_COACH_ENABLED`
- `NEXT_PUBLIC_LOCAL_BACKUP_TOOLS`
- `VERCEL_OIDC_TOKEN`
- `COACH_DAILY_LIMIT_FREE`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

## Commands

```bash
pnpm dev
pnpm lint
pnpm check:commits
pnpm tsc --noEmit
pnpm test
pnpm build
pnpm test:e2e
pnpm import:exercises
```

## Notes

- Use pnpm only; `pnpm-lock.yaml` is the lockfile source.
- The landing page lives at `/landing`.
- The landing, privacy, terms, and support pages render from the same persisted language cookie as the main app shell.
- Supabase magic links return to `/auth/callback`; browser redirects use the current origin, with `NEXT_PUBLIC_SITE_URL` as the server-side fallback.
- Push subscriptions are persisted in Supabase when configured, and daily streak reminders run through `/api/cron/streak-reminders`.
- The production deploy is connected to Vercel, but the latest workspace changes still need to be redeployed.
