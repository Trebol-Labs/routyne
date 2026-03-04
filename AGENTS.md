# AGENTS.md

Agent instructions for the **Routyne** repository. This file is the authoritative reference for agentic coding assistants operating in this codebase.

---

## Context7

Always use the **Context7 MCP** (`resolve-library-id` → `query-docs`) when the task involves:
- Library or API documentation lookups
- Code generation using third-party APIs or frameworks
- Setup or configuration steps for any dependency

Do this proactively — do not wait for the user to ask.

---

## Commands

```bash
npm run dev            # Start dev server (Turbopack, PWA disabled in dev)
npm run build          # Production build
npm run lint           # ESLint (flat config v9)
npm run test           # Run all tests with Vitest (no watch)
npm run test:coverage  # Coverage report (v8 provider — text + lcov)
```

**Run a single test file:**
```bash
npx vitest run src/lib/markdown/parser.test.ts
```

**Run tests matching a name pattern:**
```bash
npx vitest run --reporter=verbose -t "parseRoutine"
```

Package manager is **pnpm**. Node version is **20** (see `.nvmrc`). CI order: lint → test → build.

---

## Architecture Overview

Routyne is a mobile-first PWA workout tracker. Next.js 16 App Router, single-page feel — all views render in `src/app/page.tsx` via a Zustand view state machine (`currentView`).

- **Views:** `uploader` → `routine-overview` → `active-session` → `history` | `stats`
- **State:** Zustand store (`src/store/useWorkoutStore.ts`) is the single source of truth; IndexedDB (via `idb` v8) is the durable backing store.
- **Hydration:** `useHydration()` hook calls `hydrate()` once on mount; `page.tsx` gates render behind `isReady`.
- **No persistence middleware** — IDB writes are done explicitly via functional modules in `src/lib/db/`.

Key file map:

| Path | Purpose |
|------|---------|
| `src/app/page.tsx` | View orchestrator, header, bottom nav |
| `src/store/useWorkoutStore.ts` | Zustand store — all UI state and data cache |
| `src/types/workout.ts` | All shared TypeScript interfaces |
| `src/lib/db/` | Thin IDB access layer (one module per store) |
| `src/lib/markdown/parser.ts` | Markdown → `RoutineData` parser |
| `src/lib/media/resolver.ts` | Exercise name → `/api/media/{slug}` URL |
| `src/app/globals.css` | Design tokens and Liquid Glass utility classes |
| `src/test/setup.ts` | Global Vitest setup (IDB patching) |

---

## TypeScript

- **Strict mode** is enabled (`"strict": true`). No `any` escapes unless absolutely necessary — prefer `unknown` + narrowing.
- Path alias `@/` maps to `src/` — always use it for cross-directory imports.
- `moduleResolution: "bundler"` — no `.js` extensions needed on imports.
- `resolveJsonModule: true` — JSON files can be imported directly (e.g. `exercises.json`).
- `vitest/globals` is in `types`, so test globals (`describe`, `it`, `expect`, `vi`) are available without imports — but existing files import them explicitly from `vitest` anyway; follow the existing file's pattern.

### Types and Interfaces

- Domain types live in `src/types/workout.ts`; IDB record types in `src/lib/db/schema.ts`.
- Use `interface` for object shapes; use `type` only for unions and aliases.
- IDB record types end in `Record` — `RoutineRecord`, `SessionRecord`, `HistoryRecord`.
- Domain types are plain nouns — `RoutineData`, `WorkoutSession`, `ParsedExercise`.
- Use `import type { ... }` for all type-only imports.

---

## Code Style

### Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| React components | `PascalCase.tsx`, named export | `export function ActiveSessionView()` |
| Hooks | `camelCase.ts`, `use` prefix | `useHydration.ts` |
| Lib/utility modules | `camelCase.ts` | `parser.ts`, `resolver.ts` |
| DB modules | flat name matching IDB store | `routines.ts`, `history.ts` |
| Test files | collocated, `*.test.ts(x)` | `parser.test.ts` |
| Store actions | `camelCase` verbs | `importRoutine`, `finishSession` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `DB_NAME`, `DEFAULT_PROFILE` |
| CSS utility classes | `kebab-case` | `.glass-panel`, `.liquid-bg-dark` |

### Import Order

1. Framework / third-party (`react`, `framer-motion`, `zustand`)
2. Internal alias imports (`@/components/...`, `@/store/...`, `@/lib/...`, `@/types/...`)
3. Relative imports (`./parser`, `../schema`)

Use `import type` for all type-only imports. No default exports for components — named exports only.

### Formatting

- No explicit Prettier config — match surrounding code style.
- Semicolons: yes. Single quotes for strings. 2-space indentation.
- Trailing commas in multi-line structures.

---

## Error Handling

- **Store async actions that must succeed** (`finishSession`, `hydrate`): `try/catch` with `console.error('[useWorkoutStore] <action> failed', err)`.
- **Fire-and-forget IDB writes**: inline `.catch((err) => console.error(...))` — keep UI responsive.
- **Hydration failure**: fall back to `set({ isHydrated: true })` to unblock the UI rather than crashing.
- **Components**: early `return null` when required data is absent; use optional chaining (`?.`) pervasively.
- **No `throw` in UI code** — log or swallow with graceful fallbacks.
- **React error boundaries**: `ErrorBoundary` wraps the whole app at layout level and per-view as needed; it accepts a `fallback` prop for inline fallbacks.
- **Parser invalid input**: NaN-guard sets/reps with `isNaN(sets) || sets <= 0`; silently skip malformed lines.

---

## Testing

**Framework:** Vitest v4 + jsdom environment. `@testing-library/react` for component tests.

**Test file location:** Collocated with source (`src/lib/markdown/parser.test.ts` alongside `parser.ts`). Feature splits use dot notation: `useWorkoutStore.persist.test.ts`.

### Critical IDB Setup

`src/test/setup.ts` **must** have `import 'fake-indexeddb/auto'` as the **first import**. This patches all required IDB globals (`IDBRequest`, `IDBKeyRange`, `IDBCursor`, etc.). Using only `new IDBFactory()` patches `indexedDB` alone — the `idb` library will throw `ReferenceError: IDBRequest is not defined`.

### Isolation Patterns

- **Standard IDB tests** (`db.test.ts`): `deleteDatabase()` in `beforeEach`, `resetDBSingleton()` in `afterEach`.
- **Store persistence tests**: `vi.resetModules()` + `resetDBSingleton()` + fresh `IDBFactory` per test — avoids `deleteDB` hanging on in-flight fire-and-forget transactions.
- **Zustand store tests**: call `useWorkoutStore.getState().resetAll()` in `beforeEach`.

### Mocking Patterns

```ts
vi.mock('@/lib/media/providers', () => ({ mediaProvider: { resolve: vi.fn() } }));
vi.fn().mockResolvedValueOnce(value)   // sequential mock returns
vi.stubEnv('RAPIDAPI_KEY', 'test-key') // env vars
vi.spyOn(console, 'error').mockImplementation(() => {})  // suppress expected errors
vi.resetAllMocks()                     // in beforeEach to clean mock state
```

- Use accessible queries in component tests: `screen.getByRole('button', { name: /reload/i })`.
- API route tests: dynamic `import()` after `vi.resetModules()` for fresh module instances with mocks applied.

---

## Design System

The "Liquid Glass" aesthetic — utility classes in `src/app/globals.css`:

| Class | Purpose |
|-------|---------|
| `.glass-panel` | Frosted glass card (blur 40px, saturate 180%) |
| `.active-glass-btn` | Blue/indigo gradient button |
| `.liquid-bg-dark` | Radial gradient dark background |
| `.text-liquid` | Gradient clip text |
| `.sunken-glass` | Inset shadow panel |

Design tokens are CSS variables in the `@theme` block. All animations use Framer Motion with cubic-bezier `[0.23, 1, 0.32, 1]` for organic feel.

---

## Plans and Artifacts

- **Implementation plans** live in `.claude/plans/` (gitignored). Create new plans there — not in `~/.claude/plans/`.
- After any Playwright verification session, delete all screenshot files from the project root:
  ```bash
  rm -f /Users/sierra/Code/routyne/*.png
  ```
  Never commit screenshots — they are temporary verification artifacts only.

---

## PWA Notes

- PWA is disabled in development (`npm run dev`). Service worker output goes to `public/`.
- The React Compiler (`reactCompiler: true`) and Turbopack are both enabled — the `react-compiler/react-compiler: "error"` ESLint rule enforces correctness; violations are build errors.
