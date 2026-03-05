# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context7

Always use the **Context7 MCP** (`resolve-library-id` → `query-docs`) when the task involves:
- Library or API documentation lookups
- Code generation using third-party APIs or frameworks
- Setup or configuration steps for any dependency

Do this proactively — do not wait for the user to ask.

## Deployment

- **Production URL**: https://routyne-nu.vercel.app
- **Host**: Vercel Hobby tier (free) — auto-deploys from `main` via GitHub integration
- **CI**: `.github/workflows/ci.yml` — lint + test + build on every push/PR
- **Env vars**: `RAPIDAPI_KEY` set in Vercel dashboard (see `.env.example`)
- **PWA install (Android)**: open production URL in Chrome → ⋮ menu → "Add to Home Screen"
- **Preview deploys**: every PR gets a unique `*.vercel.app` URL automatically
- **SW build artifacts** (`public/sw.js`, `workbox-*.js`) are gitignored — regenerated on each build
- **Node version**: pinned to 20 via `.nvmrc` (read by Vercel and GitHub Actions)

## Commands

```bash
npm run dev            # Start dev server (PWA disabled in dev)
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Run all tests with Vitest
npm run test:coverage  # Coverage report (v8 provider)
```

Run a single test file:
```bash
npx vitest run src/lib/markdown/parser.test.ts
```

## Architecture

**Routyne** is a mobile-first PWA workout tracker. Next.js 16 App Router with a single-page feel — all views render in `src/app/page.tsx` via a Zustand view state machine.

### View State Machine

Navigation is driven by `currentView` in the Zustand store (`src/store/useWorkoutStore.ts`):

- `uploader` → `routine-overview` → `active-session` → `history`
- `stats` — summary dashboard (shows session count, volume, exercises from history)

Views are extracted into standalone components under `src/components/workout/views/`.

### Data Flow

1. User uploads a `.md` file → `RoutineUploader` reads it → `parseRoutine()` converts it to `RoutineData`
2. `RoutineData` is stored in Zustand (`setCurrentRoutine`), which transitions to `routine-overview`
3. During an active session, set completions are tracked as `Record<"sessionIdx-exerciseId-setIdx", SetStatus>`
4. `finishSession()` writes a `HistoryEntry` (with volume tracking per exercise) and transitions to `history`

### Persistence

**Implemented**: `idb` v8 + Zustand hybrid — IndexedDB as durable source of truth, Zustand as reactive in-memory cache. No `persist` middleware.

| IndexedDB Store | Purpose |
|----------------|---------|
| `routines` | Routine library (multiple saved routines) |
| `sessions` | Normalized sessions within routines |
| `exercises` | Normalized exercises within sessions |
| `history` | Completed workouts with per-set detail |
| `activeSession` | In-progress workout state (survives refresh/crash) |
| `profile` | User preferences (name, unit, rest default) |
| `meta` | Schema version flags, migration state |

Key patterns:
- `toggleSetCompletion` — sync Zustand update + fire-and-forget IDB write (stays responsive)
- `finishSession()` — awaits IDB writes (data integrity)
- `importRoutine(routine, sourceMarkdown)` — sync Zustand + background `saveRoutine()`; `setCurrentRoutine` is a backward-compat alias for tests
- `hydrate()` is explicit, called once by `useHydration()` hook; `page.tsx` gates render behind `isReady`
- Legacy migration: one-time idempotent (`migrateLegacyData()`), reads `routyne-storage` → IDB → deletes LS key
- Cursor-based pagination for history via `loadMoreHistory()` + `historyHasMore` flag

Data access layer lives in `src/lib/db/` — thin functional modules, one per store.

### Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | View orchestrator + header + bottom nav + loading skeleton |
| `src/store/useWorkoutStore.ts` | Zustand store — single source of truth for UI + data cache |
| `src/types/workout.ts` | All shared TypeScript interfaces |
| `src/lib/markdown/parser.ts` | Markdown → `RoutineData` parser (NaN guard on both formats) |
| `src/lib/media/resolver.ts` | Resolves exercise names to `/api/media/{slug}` URLs |
| `src/lib/media/providers.ts` | `MediaProvider` interface + ExerciseDB provider |
| `src/lib/data/exercises.json` | Exercise library with aliases, `media_id`, and `exercisedb_name` |
| `src/lib/db/schema.ts` | RoutineDB DBSchema type definitions |
| `src/lib/db/index.ts` | `getDB()` singleton, `resetDBSingleton()`, `deleteDatabase()` |
| `src/lib/db/routines.ts` | `saveRoutine`, `loadRoutine`, `listRoutines`, `deleteRoutine` |
| `src/lib/db/history.ts` | `saveHistoryEntry`, `loadHistory` (paginated), `loadAllHistory` |
| `src/lib/db/activeSession.ts` | `saveActiveSession`, `loadActiveSession`, `clearActiveSession` |
| `src/lib/db/profile.ts` | `loadProfile`, `saveProfile` |
| `src/lib/db/export.ts` | `exportAllData`, `downloadExportFile`, `importAllData` |
| `src/lib/db/migrate-legacy.ts` | One-time localStorage → IDB migration |
| `src/hooks/useHydration.ts` | Runs `hydrate()` once on mount, returns `isHydrated` boolean |
| `src/hooks/useWakeLock.ts` | Screen Wake Lock API wrapper (active during sessions) |
| `src/components/workout/RoutineUploader.tsx` | Markdown upload + saved routine library cards |
| `src/components/workout/ExerciseCard.tsx` | Exercise card with media cascade (video → GIF → image → fallback) |
| `src/components/workout/SetRow.tsx` | Swipe-to-complete set card (velocity + position threshold) |
| `src/components/workout/RestTimer.tsx` | Floating rest timer (requestAnimationFrame + Date.now()) |
| `src/components/workout/views/RoutineOverviewView.tsx` | Session picker + exercise sequence |
| `src/components/workout/views/ActiveSessionView.tsx` | Live workout with progress bar + set tracking + abandon |
| `src/components/workout/views/HistoryView.tsx` | Workout history with volume chips + load more |
| `src/components/workout/views/StatsView.tsx` | Stats dashboard composition |
| `src/components/workout/overlays/ProfileSheet.tsx` | Profile + export/import + storage usage |
| `src/components/workout/overlays/SetInputSheet.tsx` | Reps + weight input before logging a set |
| `src/components/workout/overlays/SearchSheet.tsx` | Exercise browser + history search |
| `src/components/stats/VolumeBarChart.tsx` | Div-based weekly volume chart |
| `src/components/stats/StreakCalendar.tsx` | 28-day workout heatmap |
| `src/components/stats/PersonalRecordsTable.tsx` | PRs computed from history |
| `src/components/ui/button.tsx` | shadcn/ui Button with CVA variants |
| `src/app/globals.css` | Design tokens and Liquid Glass utility classes |
| `src/components/ErrorBoundary.tsx` | React error boundary wrapper |

### Markdown Parser

`parseRoutine()` handles two exercise line formats:
- **Standard**: `* **Exercise Name**: 3x8-10 90s`
- **Flipped**: `3x10 Bicep Curls`

Sessions are delimited by `##` headings; the overall routine title is the `#` heading. Default rest is 90s if not specified. Invalid lines (NaN sets/reps) are silently skipped.

### Media Resolution

`resolveExerciseMedia(name)` uses Fuse.js fuzzy search (threshold 0.3) against `exercises.json` aliases. Returns `/api/media/{slug}` URL. The API route fetches from ExerciseDB (RapidAPI) with in-memory caching. ExerciseCard handles the cascade: video → GIF → image → dumbbell fallback.

### Design System

The "Liquid Glass" aesthetic is implemented via utility classes in `globals.css`:
- `.glass-panel` — frosted glass card (blur 40px, saturate 180%)
- `.active-glass-btn` — blue/indigo gradient button
- `.liquid-bg-dark` — radial gradient dark background
- `.text-liquid` — gradient clip text
- `.sunken-glass` — inset shadow panel

Design tokens are CSS variables defined in the `@theme` block. All animations use Framer Motion with cubic-bezier `[0.23, 1, 0.32, 1]` for organic feel.

### PWA

Configured via `@ducanh2912/next-pwa` in `next.config.ts`. PWA is disabled in development. Service worker output goes to `public/`. The React Compiler (`reactCompiler: true`) and Turbopack are both enabled.

### Path Alias

`@/` maps to `src/` (configured in both `tsconfig.json` and `vitest.config.ts`).

### IndexedDB Testing (fake-indexeddb)

**Critical**: `src/test/setup.ts` must `import 'fake-indexeddb/auto'` as the **first import**. This patches ALL required globals: `IDBRequest`, `IDBKeyRange`, `IDBCursor`, `IDBTransaction`, etc. Using only `new IDBFactory()` from `fake-indexeddb` patches `indexedDB` alone — the `idb` library will throw `ReferenceError: IDBRequest is not defined`.

Per-test isolation pattern:
- `setup.ts` `beforeEach`: `resetDBSingleton()` + `vi.stubGlobal('indexedDB', new IDBFactory())`
- `db.test.ts`: `deleteDatabase()` in `beforeEach`, `resetDBSingleton()` in `afterEach`
- Persist tests: `vi.resetModules()` + `resetDBSingleton()` + fresh `IDBFactory` per test (avoids `deleteDB` hanging on in-flight transactions from fire-and-forget writes)

### Playwright Testing Cleanup

After any Playwright browser session used to verify an implementation, delete all screenshot `.png` files saved to the project root before finishing:

```bash
rm -f /Users/sierra/Code/routyne/*.png
```

Never commit screenshots. They are temporary verification artifacts only.

### Plans

All implementation plans live in the project-local `.claude/plans/` directory (gitignored via `.claude/`). New plans should always be created here — **not** in the global `~/.claude/plans/`.

To execute a plan in a new session:
```
Execute the plan at .claude/plans/<plan-file>.md
```

Current plans:
- `2026-03-03-ui-ux-audit.md` — UI/UX audit findings and polish tasks

*** Future Implementation Notes

- **Routine Manager:** Implement a full routine management view (accessible via the `Library` icon in the bottom nav when a routine is active). This should allow users to view, manage, and switch between multiple saved routines seamlessly.

### Future Considerations

**Deployment readiness:**
- Request `navigator.storage.persist()` on first use to prevent browser eviction of IndexedDB
- Add error boundaries around all IDB operations (IndexedDB throws in some private browsing modes)
- Export/import is the user's only data recovery path — implement early (before cloud sync)

**Post-launch priorities:**
- Cloud sync (Supabase or similar) — requires conflict resolution strategy beyond current merge-on-import
- Offline queue for API calls (media resolution) when network returns
- Per-set `weightUnit` storage (currently unit is display-only; switching kg↔lbs reinterprets stored numbers)
- `navigator.storage.persist()` — request on first use to prevent browser eviction of IDB data
