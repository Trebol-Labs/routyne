# Routyne Status

Updated: 2026-05-06

This file is the current source of truth for the app's shipped state, roadmap health, and the next implementation moves.

## Snapshot

- Local build is green: `pnpm lint`, `pnpm test`, and `pnpm build` all pass.
- The core workout loop is shipped: uploader, routine overview, active session, workout summary, history, and stats.
- IndexedDB is the local source of truth; Supabase sync, push notifications, the AI Coach, and the bilingual app shell are opt-in feature gates.
- Supabase sync now covers profile, history, bodyweight, and routine library data, including a first authenticated bootstrap from local IDB.
- Magic-link auth completes through `/auth/callback`, then reopens the account sync panel in the main app shell.
- The app now supports a manual `es`/`en` language switch, localized landing/legal pages, history session detail sheets, and daily streak reminders via a protected cron route.
- Local production-facing backup tools are hidden, while dev/test can still expose JSON backup import/export.
- The exercise library now contains 1,316 slim entries and 1,324 raw ExerciseDB rows.
- `NEXT_PUBLIC_COACH_ENABLED=false` in `.env.local`, so the coach is configured but hidden in the UI.
- The current production deployment on Vercel is still behind the latest workspace changes and should be redeployed before release.

## Phase Evaluation

| Phase | Status | What is shipped now | What still remains |
|---|---|---|---|
| A. Foundation | Complete | 1,316-entry exercise library, persistent storage request, visual onboarding, landing page, OG metadata | No active work left in this phase |
| B. Cloud Sync | Complete | Supabase auth, sync queue, merge engine, profile/history/bodyweight/routine sync, first-auth local bootstrap, push subscriptions, streak reminder cron | No active work left in this phase |
| C. Differentiation | Complete | AI Coach, push notifications, Web Workers, share cards, achievements, body tracking, bilingual UI, history detail | Some worker hooks are still optional optimizations |
| D. Growth | Pending | Nothing production-ready beyond the current feed share card | Share Cards v2, challenges, referrals, app-store packaging |
| E. Monetization | Pending | Nothing production-ready | Stripe, subscription gate, premium themes, analytics |

## Roadmap Summary

- Phase A is done and should not be treated as open work anymore.
- Phase B is complete, including persisted push subscriptions and the daily streak reminder cron.
- Phase C is shipped in the repo, with only optional performance integration left.
- Phase D is the next meaningful product phase. Share Cards v2 is the cleanest first slice.
- Phase E should wait until retention and product direction are clearer.

## Current Config

- `RAPIDAPI_KEY`, Supabase keys, `VERCEL_OIDC_TOKEN`, and VAPID keys are present locally.
- `NEXT_PUBLIC_SITE_URL` controls server-side URL generation and auth redirect fallbacks; browser sign-in links resolve against the current origin.
- `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` match.
- `COACH_DAILY_LIMIT_FREE=5`.
- The build warning about the landing OG image route using edge runtime is expected and non-blocking.
- The `routyne-language` cookie mirrors the selected app language so the standalone pages can render before IndexedDB hydration.

## Next Steps

1. Redeploy the latest `main` branch on Vercel so the new sync, push, and i18n changes reach production.
2. Start Phase D with Share Cards v2.
3. Monitor the cron-based streak reminders after deploy.
4. Wire the worker hooks deeper into search and stats if we want the off-main-thread performance win.
