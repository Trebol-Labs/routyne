# Routyne Status

Updated: 2026-06-09

This file is the current source of truth for shipped state, roadmap health, and near-term implementation moves.

## Snapshot

- Core workout loop is shipped: routine import/create/manage, routine overview, active session, workout summary, history, nutrition, and stats.
- IndexedDB is the local source of truth; Zustand is the reactive cache.
- Supabase sync is opt-in and covers profile, history, bodyweight, routines, rich nutrition profile, and push subscription rows when the required environment variables are configured.
- First authenticated sync on a device now performs a full remote pull before queue drain and local seeding, so a fresh device is not blocked by an already-advanced shared cursor.
- Supabase OAuth/magic-link auth uses a cookie-backed browser client so the server `/auth/callback` route can complete PKCE exchange.
- The Capacitor native shell is checked in for Android/iOS under the `com.trebollabs.routyne` app id. Installed apps now load the hosted Vercel app, route auth through the custom scheme, and use native local notifications first.
- Rest timers now persist through active-session IDB state, run from the global shell across app views, reschedule/cancel native local notifications on pause/resume/adjust/hydration, deliver a foreground completion alert, and auto-clear after completion.
- Returning users now see a shell-matched startup skeleton while IDB hydrates; new users keep the lighter uploader-first startup.
- The app supports manual `es`/`en` language selection, localized standalone pages, and a persisted language cookie.
- Nutrition now uses an on-demand setup flow inside the nutrition tab: the old `/onboarding` wizard still exists, but it is no longer auto-triggered from the shell. The tab shows the setup intro when no macros have been configured, then transitions into the legacy daily tracker. Profile calculations, plan card, adaptive kcal adjustment banner, and block planner remain in `main`.
- Daily nutrition logging still uses the legacy local `nutritionEntries` and `nutritionGoals` stores.
- The AI Coach is optional. Its prompt is nutrition-aware around saved daily macro targets; the full rich nutrition profile and pending adaptive adjustment are not yet structured into `UserCoachContext`, while the imported Hevy archive digest is now available through Supabase-backed local sync.
- The AI Coach can also ingest an imported Hevy archive digest. The archive is pulled once with `HEVY_API_KEY`, stored in Supabase `hevy_archives`, synced locally, and then passed to the coach without needing the Hevy key at runtime.
- Push subscriptions can persist to Supabase when the service role key is configured; browser and PWA installs still fall back to Web Push, while native installs use local notifications first and register FCM/APNs tokens only when native remote push is explicitly enabled.
- Daily streak reminders still run through the protected Vercel Cron route `/api/cron/streak-reminders` for the web fallback, while native installs now reschedule local reminders on device.
- Exercise media/search use ExerciseDB through RapidAPI when available, and the visual routine builder now keeps the selected-day editor while a shared liquid-glass picker handles add/replace flows in both the builder and active-session edit sheet. Mobile search is now list-first with a compact selected-exercise bar and optional preview expansion, desktop caps the inline picker against the viewport and bottom nav, and the active-session edit sheet uses a deeper lifted surface with a sticky save footer. Search results stay local-first and deterministic, remote ExerciseDB supplements are deduped, and Markdown import remains collapsed behind the advanced create path.

## Recent Changes From Last Commits

- **Performance & Security Hardening**:
  - Removed leftover debug `console.log` statements in `ExerciseCard.tsx` and `exercisedb.ts`.
  - Optimized database operations by loading routines concurrently and batch-upserting them to Supabase in `syncEngine.ts`, and removing blocking sequential awaiting in `export.ts` IndexedDB `put` loops.
  - Secured API authentication endpoints (streak-reminders and push/notify) against timing side-channel attacks by introducing `timingSafeCompare` using `crypto.timingSafeEqual`.
  - Refactored streak reminder push notifications out of nested loops to avoid synchronous awaiting of push requests.
  - Protected API rate-limiters in `exercise-image/route.ts` and `hevy/import/route.ts` from IP spoofing bypasses by prioritizing secure headers (`x-real-ip` and `request.ip`).
- `6f44544` / PR #10: added the nutrition block planner in `src/lib/nutrition/planner.ts`, planner tests, the live planner UI in `NutritionView`, and prompt tests for saved nutrition targets.
- `aebaf91` / PR #9: added nutrition onboarding, rich nutrition profile persistence, Supabase `nutrition_profiles` sync, nutrition plan card, adaptive adjustment logic/banner, and onboarding gate.
- Current worktree: moved nutrition setup to an on-demand tab flow with persisted macros configuration, disabled the shell auto-redirect to `/onboarding`, and kept the legacy wizard route available for existing users.
- Current worktree: expanded the nutrition tab with a diet calendar view, a weekly macro-suggestion banner backed by `weeklyAdjustment` logic and persisted macro suggestions, and a daily reminders sync hook that schedules weight and meal reminders through the notification provider.
- Current worktree: exercise search now uses a mobile list-first picker with a compact selected bar, optional preview expansion, desktop viewport/nav-capped embedded picker, and a lifted active-session edit sheet.
- Current worktree: the active-session edit sheet now clears the floating bottom nav on mobile so the sticky save footer remains visible during replace/edit flows.
- Current worktree: added Hevy archive migration, digest generation, Supabase archive storage, and coach context wiring.
- Current worktree: rest timers now stay mounted across shell navigation, tick from wall-clock time instead of stale render state, use immediate completion notifications in foreground, and fall back to in-page browser notifications when a dev or browser context has no active service worker.
- `3a5b00a` / PR #8: added structured sync traces in `src/lib/sync/debug.ts`, exposed through `window.__routyneSync`.
- Current worktree: rest timer persistence + notification reconciliation, startup shell skeleton, streak timezone alignment, and mobile helper scripts.
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
- `HEVY_API_KEY` is required only for the one-time Hevy migration route that seeds Supabase `hevy_archives`.
- `NEXT_PUBLIC_SITE_URL` controls server-side URL generation and auth redirect fallback; browser sign-in links resolve against the current origin.
- `NEXT_PUBLIC_NUTRITION_ENABLED` defaults on; set it to `false` to disable rich nutrition onboarding/profile flows.
- `NEXT_PUBLIC_COACH_ENABLED=false` hides the AI Coach button even if `/api/coach` is configured.
- `VERCEL_OIDC_TOKEN` is required for `/api/coach`.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PUBLIC_KEY` should match.
- `NEXT_PUBLIC_NATIVE_PUSH_ENABLED=true` opts native installs into FCM/APNs token registration. Leave it unset or `false` for local-only native alerts.
- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side push subscription storage, native device registration, and the streak reminder cron.
- `CRON_SECRET` protects `/api/cron/streak-reminders`.
- `CAPACITOR_SERVER_URL` overrides the URL loaded by the native shell during device testing. If unset, the shell uses `NEXT_PUBLIC_SITE_URL`.
- For web-only changes, the default Android loop is deploy to Vercel, then force-close and reopen the installed app. Use `pnpm mobile:android:install` only when native shell files change.
- `android/app/google-services.json` and `ios/App/App/GoogleService-Info.plist` are required for native push testing.

## Pragmatic Next Implementation Phases

Based on the Phase Evaluation, the following actionable roadmap outlines the next pragmatic steps for development:

**1. Finish Phase C (Differentiation)**
- **AI Coach Nutrition Integration**: Wire the rich nutrition profile and any pending adaptive adjustments into `UserCoachContext` to enhance the AI Coach's capabilities.
- **Mobile Release Prep**: Complete store packaging, including final assets and App Store / Play Store configuration.
- **Push Notification Polish**: Finish Firebase/APNs asset setup and execute a real-device Android notification matrix before the final native shell release.

**2. Kickoff Phase D (Growth)**
- **Share Cards v2**: Implement the next iteration of share cards with richer visual data and better social platform compatibility.
- **Social & Gamification**: Introduce initial challenges and referral mechanisms to drive organic user growth.

**3. Prepare Phase E (Monetization)**
- **Foundation**: Assess requirements for Stripe integration and begin designing the premium subscription gate and tiered features.

**4. Ongoing Maintenance**
- Monitor `window.__routyneSync.dump()` output in production to validate first-device sync and nutrition profile sync across diverse real-world accounts.
