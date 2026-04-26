# Routyne

Routyne is a mobile-first Next.js PWA workout tracker. It stores workouts locally in IndexedDB, syncs to Supabase when configured, and includes stats, share cards, push notifications, and an optional AI coach.

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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_COACH_ENABLED`
- `VERCEL_OIDC_TOKEN`
- `COACH_DAILY_LIMIT_FREE`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Commands

```bash
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm import:exercises
```

## Notes

- The landing page lives at `/landing`.
- The production deploy is connected to Vercel, but the latest workspace changes still need to be redeployed.
