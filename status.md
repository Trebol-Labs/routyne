# Routyne Status

Updated: 2026-04-25

This file is the current source of truth for the app's shipped state, roadmap health, and the next implementation moves.

## Snapshot

- Local build is green: `pnpm lint`, `pnpm test`, and `pnpm build` all pass.
- The core workout loop is shipped: uploader, routine overview, active session, workout summary, history, and stats.
- IndexedDB is the local source of truth; Supabase, push notifications, and the AI Coach are opt-in feature gates.
- The exercise library now contains 1,316 slim entries and 1,324 raw ExerciseDB rows.
- `NEXT_PUBLIC_COACH_ENABLED=false` in `.env.local`, so the coach is configured but hidden in the UI.
- The current production deployment on Vercel is still behind the latest workspace changes and should be redeployed before release.

## Phase Evaluation

| Phase | Status | What is shipped now | What still remains |
|---|---|---|---|
| A. Foundation | Complete | 1,316-entry exercise library, persistent storage request, visual onboarding, landing page, OG metadata | No active work left in this phase |
| B. Cloud Sync | Complete | Supabase auth, sync queue, merge engine, profile sync, history soft-delete support | Push subscriptions are still in-memory on Hobby tier |
| C. Differentiation | Complete | AI Coach, push notifications, Web Workers, share cards, achievements, body tracking, routine manager | Some worker hooks are still optional optimizations |
| D. Growth | Pending | Nothing production-ready beyond the current feed share card | Share Cards v2, challenges, referrals, app-store packaging |
| E. Monetization | Pending | Nothing production-ready | Stripe, subscription gate, premium themes, analytics |

## Roadmap Summary

- Phase A is done and should not be treated as open work anymore.
- Phase B is functionally complete, but push persistence is still a reliability gap if we want notifications to survive cold starts.
- Phase C is shipped in the repo, with only optional performance integration left.
- Phase D is the next meaningful product phase. Share Cards v2 is the cleanest first slice.
- Phase E should wait until retention and product direction are clearer.

## Current Config

- `RAPIDAPI_KEY`, Supabase keys, `VERCEL_OIDC_TOKEN`, and VAPID keys are present locally.
- `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` match.
- `COACH_DAILY_LIMIT_FREE=5`.
- The build warning about the landing OG image route using edge runtime is expected and non-blocking.

## Next Steps

1. Redeploy the current `main` branch to Vercel and verify the latest env vars on the live project.
2. Decide whether push subscriptions should move from in-memory storage to Supabase persistence.
3. Start Phase D with Share Cards v2.
4. Wire the worker hooks deeper into search and stats if we want the off-main-thread performance win.
