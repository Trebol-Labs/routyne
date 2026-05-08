# Routyne Status

Updated: 2026-05-08

This file is the current source of truth for shipped state, roadmap health, and near-term implementation moves.

## Snapshot

- Core workout loop is shipped: routine import/create/manage, routine overview, active session, workout summary, history, nutrition, and stats.
- IndexedDB is the local source of truth; Zustand is the reactive cache.
- Supabase sync is opt-in and covers profile, history, bodyweight, routines, rich nutrition profile, and push subscription rows when the required environment variables are configured.
- First authenticated sync on a device now performs a full remote pull before queue drain and local seeding, so a fresh device is not blocked by an already-advanced shared cursor.
- Supabase OAuth/magic-link auth uses a cookie-backed browser client so the server `/auth/callback` route can complete PKCE exchange.
- The Capacitor native shell is checked in for Android/iOS under the `com.trebollabs.routyne` app id. Installed apps now load the hosted Vercel app, route auth through the custom scheme, and use native local notifications first.
- The app supports manual `es`/`en` language selection, localized standalone pages, and a persisted language cookie.
- Nutrition onboarding, profile calculations, plan card, adaptive kcal adjustment banner, and block planner are in `main`.
- Daily nutrition logging still uses the legacy local `nutritionEntries` and `nutritionGoals` stores.
- The AI Coach is optional. Its prompt is nutrition-aware around saved daily macro targets, but the full rich nutrition profile and pending adaptive adjustment are not yet structured into `UserCoachContext`.
- Push subscriptions can persist to Supabase when the service role key is configured; browser and PWA installs still fall back to Web Push, while native installs register FCM/APNs tokens through authenticated device rows.
- Daily streak reminders still run through the protected Vercel Cron route `/api/cron/streak-reminders` for the web fallback, while native installs now reschedule local reminders on device.
- Exercise media/search depend on ExerciseDB through RapidAPI.

## Recent Changes From Last Commits

- `6f44544` / PR #10: added the nutrition block planner in `src/lib/nutrition/planner.ts`, planner tests, the live planner UI in `NutritionView`, and prompt tests for saved nutrition targets.
- `aebaf91` / PR #9: added nutrition onboarding, rich nutrition profile persistence, Supabase `nutrition_profiles` sync, nutrition plan card, adaptive adjustment logic/banner, and onboarding gate.
- `3a5b00a` / PR #8: added structured sync traces in `src/lib/sync/debug.ts`, exposed through `window.__routyneSync`.
- `4d96352` / PR #7: forced a full pull during first-device sync so a new local IDB can hydrate from existing remote data.
- `fff70bc` and `42d7929`: switched browser Supabase auth to `createBrowserClient` and added coverage for the cookie-backed client.
- `dd77537` and `786a496`: removed anonymous sign-in and deduped bodyweight sync by date.
- `b1dbed9` and `9447ba3`: made sync tolerant of legacy bodyweight and profile schema gaps.
- `d895e19` and `59cda50`: updated Playwright smoke coverage for the localized UI and current backup format.

## Phase Evaluation

| Phase | Status | What is shipped now | What remains |
|---|---|---|---|
| A. Foundation | Complete | Exercise library, persistent storage request, visual onboarding, landing page, OG metadata, localized legal/support pages | No active work left |
| B. Cloud Sync | Complete | Supabase auth, sync queue, merge engine, profile/history/bodyweight/routine/nutrition-profile sync, first-device bootstrap, push subscriptions, streak reminder cron | Monitor production sync traces after deploys |
| C. Differentiation | Mostly complete | AI Coach, push notifications, native mobile shell, Web Workers, share cards, achievements, body tracking, bilingual UI, history detail, nutrition onboarding/planner | Wire rich nutrition profile and pending adjustment into AI Coach context if nutrition coaching remains a priority; finish store packaging and mobile release assets |
| D. Growth | Pending | Current feed share card only | Share Cards v2, challenges, referrals, app-store packaging |
| E. Monetization | Pending | Nothing production-ready | Stripe, subscription gate, premium themes, analytics |

## Current Config Notes

- `RAPIDAPI_KEY` is required for production media/search.
- `NEXT_PUBLIC_SITE_URL` controls server-side URL generation and auth redirect fallback; browser sign-in links resolve against the current origin.
- `NEXT_PUBLIC_NUTRITION_ENABLED` defaults on; set it to `false` to disable rich nutrition onboarding/profile flows.
- `NEXT_PUBLIC_COACH_ENABLED=false` hides the AI Coach button even if `/api/coach` is configured.
- `VERCEL_OIDC_TOKEN` is required for `/api/coach`.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PUBLIC_KEY` should match.
- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side push subscription storage, native device registration, and the streak reminder cron.
- `CRON_SECRET` protects `/api/cron/streak-reminders`.
- `CAPACITOR_SERVER_URL` overrides the URL loaded by the native shell during device testing. If unset, the shell uses `NEXT_PUBLIC_SITE_URL`.
- `android/app/google-services.json` and `ios/App/App/GoogleService-Info.plist` are required for native push testing.

## Next Steps

1. Verify the latest `main` deployment on Vercel after merging documentation changes.
2. Finish Firebase/APNs asset setup and do a real-device Android notification matrix before releasing the native shell.
3. Decide whether to wire the rich nutrition profile and pending adaptive adjustment into `UserCoachContext`.
4. Monitor `window.__routyneSync.dump()` output while validating first-device sync and nutrition profile sync on real accounts.
5. Start Phase D with Share Cards v2 if product work resumes.
