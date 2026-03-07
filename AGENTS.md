# AGENTS.md

Agent instructions for **Routyne**, a mobile-first Next.js PWA workout tracker. This is the authoritative reference for agentic coding assistants operating in this codebase.

---

## Commands

```bash
npm run dev            # Start dev server (Turbopack, PWA disabled in dev)
npm run build          # Production build
npm run lint           # ESLint (flat config v9)
npm run test           # Run all tests with Vitest
npm run test:coverage  # Coverage report (v8 provider — text + lcov)
```

**Run a single test file:**
```bash
npx vitest run src/lib/markdown/parser.test.ts
npx vitest run -t "pattern name"  # Run tests matching pattern
```

Package manager: **pnpm**. Node: **20** (`.nvmrc`). CI order: lint → test → build.

---

## Architecture

- **App Router:** Single-page PWA in `src/app/page.tsx` with Zustand view state machine (`currentView`)
- **State:** `src/store/useWorkoutStore.ts` (Zustand) is the single source of truth
- **Persistence:** IndexedDB (via `idb` v8) as durable backing; Zustand as reactive cache
- **No persistence middleware** — IDB writes are explicit in `src/lib/db/` modules
- **Hydration:** `useHydration()` hook gates UI behind `isReady` flag; `hydrate()` called once on mount

**View state machine:** `uploader` → `routine-overview` → `active-session` → `history` | `stats`

**Key files:**
| Path | Purpose |
|------|---------|
| `src/app/page.tsx` | View orchestrator, header, bottom nav |
| `src/store/useWorkoutStore.ts` | Zustand store (source of truth) |
| `src/types/workout.ts` | All shared TypeScript domain types |
| `src/lib/db/` | Thin functional IDB access layer (one module per store) |
| `src/lib/markdown/parser.ts` | Markdown → `RoutineData` (supports 2 formats) |
| `src/lib/media/resolver.ts` | Exercise name → `/api/media/{slug}` via Fuse.js fuzzy search |
| `src/app/globals.css` | Design tokens, Liquid Glass utility classes |
| `src/test/setup.ts` | Vitest global setup (IDB patching) |

---

## Code Style & TypeScript

### Imports & Naming
- **Import order:** Framework (`react`, `framer-motion`) → `@/` aliases → relative imports
- **Components:** `PascalCase.tsx`, named exports only
- **Hooks:** `useHookName.ts` (camelCase)
- **DB types:** End with `Record` (e.g., `RoutineRecord`, `HistoryRecord`)
- **Domain types:** Plain nouns (e.g., `ParsedExercise`, `WorkoutSession`, `SetStatus`)
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Always use `import type { ... }`** for type-only imports
- **Path alias `@/`** maps to `src/` — always use it for cross-directory imports

### Formatting
- **Strict TypeScript:** No `any` escapes. Prefer `unknown` + narrowing
- Semicolons: yes. Quotes: single. Indentation: 2 spaces
- Trailing commas in multi-line structures

### Interfaces vs Types
- **Interface:** Object shapes and domain models
- **Type:** Unions, aliases, and variants only

---

## Error Handling

- **Store async actions** (`finishSession`, `hydrate`): `try/catch` with `console.error('[useWorkoutStore] <action> failed', err)`
- **Fire-and-forget IDB writes** (e.g., `toggleSetCompletion`): inline `.catch(err => console.error(...))`
- **Hydration failure:** Fall back to `set({ isHydrated: true })` to unblock UI rather than crashing
- **UI components:** Early `return null` when data missing; use optional chaining (`?.`) pervasively
- **No `throw` in UI** — log or swallow with graceful fallbacks
- **Parser invalid input:** NaN-guard with `isNaN(sets) || sets <= 0`; silently skip malformed lines
- **React error boundaries:** `ErrorBoundary` wraps app at layout level and key views

---

## Testing (Vitest v4 + jsdom)

**Test location:** Collocated with source (`src/lib/markdown/parser.test.ts` alongside `parser.ts`).

### Critical IDB Setup
`src/test/setup.ts` **must** have `import 'fake-indexeddb/auto'` as the **first import**. This patches ALL IDB globals (`IDBRequest`, `IDBKeyRange`, `IDBCursor`, `IDBTransaction`, etc.). Using only `new IDBFactory()` will fail with `ReferenceError: IDBRequest is not defined`.

### Isolation Patterns
```ts
// Standard IDB tests: cleanup in beforeEach/afterEach
beforeEach(() => deleteDatabase('routyne-db'));
afterEach(() => resetDBSingleton());

// Store persistence tests: full isolation
vi.resetModules(); resetDBSingleton(); new IDBFactory();

// Zustand store: reset state
useWorkoutStore.getState().resetAll();

// Mocking
vi.mock('@/lib/media/providers', () => ({ mediaProvider: { resolve: vi.fn() } }));
vi.stubEnv('RAPIDAPI_KEY', 'test-key');
vi.spyOn(console, 'error').mockImplementation(() => {});
```

Use accessible queries: `screen.getByRole('button', { name: /reload/i })`.

---

## Design System & Animations

**Liquid Glass aesthetic** via `.glass-panel`, `.active-glass-btn`, `.liquid-bg-dark`, `.text-liquid`, `.sunken-glass` in `src/app/globals.css`.

All animations use Framer Motion with cubic-bezier `[0.23, 1, 0.32, 1]` for organic feel. Gesture interactions (swipe, drag) use:
- `dragConstraints` for boundaries
- `useMotionValue` + `useTransform` for real-time feedback
- Spring physics (`stiffness: 480, damping: 32`) for natural snapping

---

## Performance & PWA

- **React Compiler + Turbopack** enabled; `react-compiler: "error"` ESLint rule enforces correctness
- **PWA disabled in dev** (`npm run dev`); service worker generated in `public/` at build time
- **Code splitting:** Use `import()` for route-specific components
- **Bundle size:** Prefer tree-shakeable libraries; avoid default exports in lib code

---

## Deployment & Vercel

- **Production URL**: https://routyne-nu.vercel.app
- **Host**: Vercel Hobby tier (free) — auto-deploys from `main` via GitHub
- **CI**: `.github/workflows/ci.yml` — lint + test + build on every push/PR
- **Env vars**: `RAPIDAPI_KEY` set in Vercel dashboard (see `.env.example`)
- **Node version**: Pinned to 20 via `.nvmrc` (read by Vercel and GitHub Actions)

---

## Artifacts & Planning

- **Plans:** Save to `.claude/plans/` (gitignored) — NOT `~/.claude/plans/`
- **Screenshots:** Delete all `*.png` from project root after Playwright verification:
  ```bash
  rm -f /Users/sierra/Code/routyne/*.png
  ```
  Never commit screenshots — they're temporary verification artifacts only.

---

## Context7 MCP

Always use the **Context7 MCP** (`resolve-library-id` → `query-docs`) when the task involves:
- Library or API documentation lookups
- Code generation using third-party APIs or frameworks
- Setup or configuration steps for any dependency

Do this proactively — do not wait for the user to ask.
