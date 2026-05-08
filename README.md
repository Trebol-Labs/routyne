# Routyne

Routyne is a mobile-first Next.js PWA workout tracker. It stores workouts locally in IndexedDB, syncs profile, history, bodyweight, routine, nutrition profile, and push subscription data to Supabase when configured, and includes stats, share cards, push notifications, bilingual `es`/`en` UI, nutrition planning, and an optional AI Coach.

## Documentation

- Documentation index: [`docs/README.md`](/Users/sierra/Code/routyne/docs/README.md)
- Current status and roadmap: [`docs/status.md`](/Users/sierra/Code/routyne/docs/status.md)
- Shared Claude/Codex context: [`AGENTS.md`](/Users/sierra/Code/routyne/AGENTS.md)
- Environment reference: [`.env.example`](/Users/sierra/Code/routyne/.env.example)

## Getting Started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

`RAPIDAPI_KEY` is required for production ExerciseDB media/search. See [`docs/development.md`](/Users/sierra/Code/routyne/docs/development.md) for the full environment table.

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
- Node version is `20` from `.nvmrc`.
- Production URL: `https://routyne-nu.vercel.app`.
- Vercel auto-deploys from `main`; CI runs lint, commit guard, typecheck, tests, build, and Playwright smoke.
