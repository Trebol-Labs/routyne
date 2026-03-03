# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | View orchestrator + header + bottom nav + stats view |
| `src/store/useWorkoutStore.ts` | Zustand store with persist middleware — single source of truth |
| `src/types/workout.ts` | All shared TypeScript interfaces |
| `src/lib/markdown/parser.ts` | Markdown → `RoutineData` parser (NaN guard on both formats) |
| `src/lib/media/resolver.ts` | Resolves exercise names to `/api/media/{slug}` URLs |
| `src/lib/media/providers.ts` | `MediaProvider` interface + ExerciseDB provider |
| `src/lib/data/exercises.json` | Exercise library with aliases, `media_id`, and `exercisedb_name` |
| `src/hooks/useWakeLock.ts` | Screen Wake Lock API wrapper (active during sessions) |
| `src/components/workout/RoutineUploader.tsx` | Markdown file upload + paste UI |
| `src/components/workout/ExerciseCard.tsx` | Exercise card with media cascade (video → GIF → image → fallback) |
| `src/components/workout/SetRow.tsx` | Swipe-to-complete set card (velocity + position threshold) |
| `src/components/workout/RestTimer.tsx` | Floating rest timer (requestAnimationFrame + Date.now()) |
| `src/components/workout/views/RoutineOverviewView.tsx` | Session picker + exercise sequence |
| `src/components/workout/views/ActiveSessionView.tsx` | Live workout with progress bar + set tracking |
| `src/components/workout/views/HistoryView.tsx` | Workout history with volume chips + relative dates |
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

### Playwright Testing Cleanup

After any Playwright browser session used to verify an implementation, delete all screenshot `.png` files saved to the project root before finishing:

```bash
rm -f /Users/sierra/Code/routyne/*.png
```

Never commit screenshots. They are temporary verification artifacts only.

### Plans

Implementation plans are stored in `.claude/plans/` (gitignored). To execute a plan in a new session:
```
Execute the plan at .claude/plans/<plan-file>.md
```

Current plans:
- `2026-02-26-exercise-media-sourcing.md` — ExerciseDB API integration (7 tasks)
- `2026-02-26-exercise-media-sourcing-design.md` — Design doc for media sourcing
- `2026-02-27-ui-fine-tuning.md` — UI polish: fonts, button system, anime.js, a11y (11 tasks)
