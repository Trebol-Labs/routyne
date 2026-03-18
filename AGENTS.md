# AGENTS.md

Agent instructions for **Routyne**, a mobile-first Next.js PWA workout tracker. This is the authoritative guide for coding agents working in this repo.

## Commands

```bash
pnpm dev               # Start dev server (Turbopack, PWA disabled in dev)
pnpm build             # Production build
pnpm lint              # ESLint (flat config v9)
pnpm test              # Run all Vitest tests
pnpm test:coverage     # Coverage report (v8 provider)
```

**Single-test workflows:**
```bash
pnpm test src/lib/markdown/parser.test.ts
pnpm test -t "pattern name"
```

**Environment:**
- Package manager: `pnpm`
- Node: `20` from `.nvmrc`
- CI order: `pnpm lint` → `pnpm test` → `pnpm build`
- Production build expects `RAPIDAPI_KEY`

## Repo Rules

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files currently exist in this repo.
- Treat this file as the main agent policy unless new rule files are added later.

## Architecture

- App Router app with a single main shell in `src/app/page.tsx`
- Zustand store in `src/store/useWorkoutStore.ts` is the source of truth
- IndexedDB via `idb` is the durable data layer; Zustand is the reactive cache
- Persistence is explicit in `src/lib/db/*`; there is no Zustand persistence middleware
- Hydration is gated through `useHydration()` and store `hydrate()`

**Primary flow:** `uploader` → `routine-overview` → `active-session` → `history` | `stats`

**Important files:**
- `src/app/page.tsx` - main view orchestration
- `src/store/useWorkoutStore.ts` - store state and async actions
- `src/types/workout.ts` - shared domain types
- `src/lib/db/` - IndexedDB access modules
- `src/lib/markdown/parser.ts` - markdown to `RoutineData`
- `src/lib/media/resolver.ts` - fuzzy media resolution
- `src/app/globals.css` - design tokens and glass utilities
- `src/test/setup.ts` - Vitest global setup

## Code Style

### Imports
- Order imports as: framework/library → `@/` aliases → relative imports
- Use `import type { ... }` for type-only imports
- Prefer `@/` over long relative paths for cross-folder imports

### Formatting
- TypeScript is strict; do not introduce `any`
- Use semicolons, single quotes, and 2-space indentation
- Keep trailing commas in multiline objects/arrays/params
- Prefer named exports; avoid default exports for internal components and lib modules

### Types and Naming
- Use `interface` for object/domain shapes
- Use `type` for unions, aliases, and discriminated variants
- Components: `PascalCase.tsx`
- Hooks: `useThing.ts`
- Store actions: clear verb-based names
- DB persistence shapes end in `Record`
- Domain models use plain nouns like `ParsedExercise`, `WorkoutSession`, `SetStatus`
- Constants use `SCREAMING_SNAKE_CASE`

### React and Next.js
- Mark client components with `'use client';` only when required
- Prefer small focused components over large branching JSX blocks
- Keep overlays/sheets accessible: dialog roles, close affordances, keyboard escape when appropriate
- Preserve the current Liquid Glass visual language unless the user asks for a redesign

## Store and Persistence Rules

- `useWorkoutStore` is the canonical app state; do not duplicate business state elsewhere
- Async store actions should update Zustand predictably and persist to IDB deliberately
- Fire-and-forget writes should use `.catch(console.error)` or equivalent logged handling
- `saveRoutine()` can be called with or without `sourceMarkdown`; when omitted it preserves the existing markdown
- `updateActiveSessionExercises()` is the store action for live session editing
- Keep IDB modules thin and functional; do not bury app logic in DB helpers

## Error Handling

- Store async actions use `try/catch` with namespaced logging like `console.error('[useWorkoutStore] hydrate failed', err)`
- UI should fail soft: return `null`, use optional chaining, and avoid throwing in render paths
- Hydration failures should unblock the UI instead of bricking the app
- Parser errors should skip malformed lines rather than crash the import flow
- Background persistence failures should be logged, not ignored silently

## Testing

- Tests are colocated with source files when practical
- Test runner: Vitest with `jsdom`
- Always keep `import 'fake-indexeddb/auto';` as the **first import** in `src/test/setup.ts`
- That import patches all IndexedDB globals; partial setup is not enough

**Useful patterns:**
```ts
beforeEach(() => deleteDatabase('routyne-db'));
afterEach(() => resetDBSingleton());

vi.resetModules();
resetDBSingleton();
vi.stubGlobal('indexedDB', new IDBFactory());

useWorkoutStore.getState().resetAll();
vi.spyOn(console, 'error').mockImplementation(() => {});
```

**Testing guidance:**
- Prefer accessible queries like `screen.getByRole(...)`
- Mock media/provider integrations rather than hitting external APIs
- When changing persistence behavior, run the full test suite, not just one file

## Lint, Build, and Verification Notes

- ESLint uses Next core-web-vitals + TypeScript configs plus `react-compiler/react-compiler: error`
- `pnpm build` runs a real production compile and can catch stricter type issues than isolated edits
- If you touch UI, verify both mobile and desktop layouts
- Delete temporary Playwright screenshots from the repo root after verification: `rm -f /Users/sierra/Code/routyne/*.png`

## Design System and Motion

- Reuse existing utility classes such as `.glass-panel`, `.sunken-glass`, `.active-glass-btn`, `.liquid-bg-dark`
- Motion uses Framer Motion with the easing `[0.23, 1, 0.32, 1]`
- Gesture-driven UI uses `useMotionValue`, transforms, and spring/snapping behavior
- Keep mobile-first spacing and avoid horizontal overflow
- Preserve the current blue/liquid-glass aesthetic when extending workout UI

## Git and Agent Workflow

- Commit only when the user explicitly asks
- Never commit secrets or files like `.env`
- Do not use destructive git commands unless explicitly requested
- Avoid `--no-verify` and force pushes unless the user explicitly asks
- Prefer small focused commits that explain why the change exists

## Planning Artifacts

- Save plans in `.claude/plans/`
- Do not commit scratch files, local debug scripts, or screenshots
- Clean up temporary artifacts before finishing work

## External Docs

Use Context7 proactively when work depends on third-party library or framework documentation, setup, or API details.
