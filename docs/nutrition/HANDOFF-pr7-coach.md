# Handoff — PR #7 Coach IA Integration

Self-contained brief to finish the last roadmap PR of the nutrition module
(`docs/nutrition/`). Hand this file to another LLM/agent. It does **not**
require chat history with the previous agent.

---

## 1. Repo + branch state

- **Repo**: `Trebol-Labs/routyne`
- **Stack**: Next.js 16 (App Router) + React 19 + TS strict + Tailwind v4 +
  Zustand + IndexedDB (`idb`) + Supabase + framer-motion + recharts.
- **Tests**: vitest (unit, alongside source: `foo.ts` + `foo.test.ts`),
  Playwright (e2e in `e2e/`).
- **Feature flag**: `NUTRITION_ENABLED` — already added to
  `src/lib/feature-flags.ts`. Default ON; off via
  `NEXT_PUBLIC_NUTRITION_ENABLED=false`.

PRs already shipped on the working branch (read those before changing
related files):

| PR | What | Key files |
|----|------|-----------|
| 1  | Types + science engine + tests        | `src/types/nutrition.ts`, `src/lib/nutrition/calculations.ts(.test.ts)` |
| 2  | Onboarding wizard + gate              | `src/app/onboarding/`, `src/components/nutrition/onboarding/`, `src/hooks/useOnboardingGate.ts`, `src/lib/db/nutritionProfile.ts`, `e2e/onboarding.spec.ts` |
| 3  | Supabase sync of `nutritionProfile`   | `src/lib/supabase/{schema.sql,client.ts}`, `src/lib/db/schema.ts`, `src/lib/sync/{merge.ts,syncEngine.ts,sync.test.ts}` |
| 5  | Plan card + empty state in nutrition tab | `src/components/nutrition/{NutritionPlanCard.tsx,NutritionEmptyState.tsx}`, `src/components/workout/views/NutritionView.tsx` |
| 6  | Adaptive algorithm + banner           | `src/lib/nutrition/adaptive.ts(.test.ts)`, `src/lib/db/nutritionAdjustment.ts`, `src/hooks/useAdaptiveCheck.ts`, `src/components/nutrition/AdjustmentBanner.tsx` |

What is **NOT** done and is the scope of this PR (#7):

- The Coach IA does not see the nutrition profile, plan, today's log,
  recent logs, or the pending adjustment.
- The system prompt has no nutrition guidance.
- `CoachSheet.tsx` shows no nutrition-aware quick prompts.

The full spec for this PR lives at `docs/nutrition/09-coach-integration.md`.
**Read that file first.** This handoff summarizes it; the doc is canonical
when in conflict.

---

## 2. Existing coach surface area

Read these end-to-end before editing:

- `src/lib/coach/context-builder.ts` — assembles `UserCoachContext` from IDB
  (profile, recent sessions, PRs, muscle-volume). Pure: no network. Returns
  a structured object.
- `src/lib/coach/prompts.ts` — system prompts switched by `coachTone`
  (`direct` / `supportive` / `technical`) and language (`es`/`en`).
- `src/app/api/coach/` — streaming endpoint using `@ai-sdk/anthropic` (model
  is Claude Sonnet; check `route.ts` for the exact ID before suggesting
  changes).
- `src/components/workout/overlays/CoachSheet.tsx` — chat UI; reads context
  via the builder, renders chips/quick prompts.

---

## 3. Deliverables

### 3.1 Extend `UserCoachContext` with a nutrition slice

In `src/lib/coach/context-builder.ts`:

1. Import:
   - `loadNutritionProfile` from `@/lib/db/nutritionProfile`
   - `loadPendingAdjustment` from `@/lib/db/nutritionAdjustment`
   - `loadAllBodyweight` from `@/lib/db/bodyweight` (already used elsewhere)
   - `NUTRITION_ENABLED` from `@/lib/feature-flags`
2. Add a new optional field on `UserCoachContext`:
   ```ts
   nutrition?: {
     goal: 'bulk' | 'cut' | 'recomp';
     experience: 'beginner' | 'intermediate' | 'advanced';
     targetKcal: number;
     macros: { proteinG: number; carbsG: number; fatsG: number };
     trainingTime: 'morning' | 'afternoon' | 'evening' | null;
     restrictions: string[];           // dietaryRestrictions ∪ customRestrictions
     pendingAdjustment: {
       reason: 'too_fast' | 'too_slow' | 'on_track' | 'insufficient_data';
       weeklyWeightChangePct: number;
       previousTargetKcal: number;
       suggestedTargetKcal: number;
       deltaKcal: number;
     } | null;
   };
   ```
3. Build it from IDB. **Skip entirely** if `!NUTRITION_ENABLED` or
   `loadNutritionProfile()` returns `null`. Do not throw on missing data.

> Note: Today's nutrition log + recent logs (mentioned in
> `docs/nutrition/09-coach-integration.md` §9.3) live on the **legacy**
> nutrition stores (`nutritionEntries` / `nutritionGoals` in
> `src/lib/db/nutrition.ts`), not on the new profile-driven log table from
> doc 03 — that one was deferred. Use what exists today: load entries via
> `loadNutritionEntriesByDate(today)` and aggregate macros server-side. If
> aggregation feels noisy, ship the profile + pendingAdjustment first and
> open a follow-up issue for the daily log slice.

### 3.2 Extend the system prompt

In `src/lib/coach/prompts.ts`:

1. Add a `nutritionGuidance` block (es + en) containing:
   - "Reason from the user's computed plan; never invent kcal/macros."
   - "Respect dietary restrictions when proposing meals."
   - "Peri-workout: high-leucine protein meal within 4h pre/post; dose
     0.4–0.55 g/kg."
   - "If a stall is reported, point at the next adaptive check rather than
     improvising kcal changes."
   - "Approved supplements only: creatine 3–5g/day, whey, caffeine 3–6 mg/kg
     pre-workout."
   - "State honestly that BMR/TDEE formulas have ±10–20% error; ground
     truth is the weight trend."
2. Concatenate the block into the existing system prompt **only when**
   `context.nutrition` is present. Keep the non-nutrition path byte-for-byte
   identical (so users without a profile see no change).
3. Apply Anthropic prompt-caching where the codebase already does it (look
   for `cache_control` in `src/app/api/coach/`). The nutrition block is a
   strong cache candidate because it changes rarely.

### 3.3 Quick prompts in `CoachSheet.tsx`

Add reactive chips above the input. Show only chips whose precondition
holds:

| Chip                                      | Precondition                                |
|-------------------------------------------|---------------------------------------------|
| "Explain why I should adjust my calories" | `context.nutrition?.pendingAdjustment != null` |
| "Suggest a 35g protein dinner"            | profile exists AND user is on a cut/recomp goal |
| "How am I doing with the deficit?"        | `goal === 'cut'`                            |

Strings via `useI18n()`; add keys under `coach.nutritionPrompts.*` in
`src/lib/i18n/translations.ts` (es + en).

### 3.4 Tests

- **Unit** `src/lib/coach/context-builder.test.ts` (create or extend):
  - Snapshot when no profile → no `nutrition` field.
  - Snapshot when profile + pending adjustment present → fields populated
    correctly.
- **Unit** `src/lib/coach/prompts.test.ts` (create if missing):
  - System prompt without nutrition is unchanged from a baseline snapshot.
  - With nutrition: snapshot includes the guidance block once, in the right
    language.
- **E2E** is optional. Don't add Playwright unless trivial.

---

## 4. Acceptance criteria

- [ ] `npx tsc --noEmit` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` green (existing tests still pass + new unit coverage on
      the nutrition slice and the prompt builder).
- [ ] With `NUTRITION_ENABLED=false`: coach behavior is byte-identical to
      before this PR (verify by comparing the system prompt for a stub user).
- [ ] With `NUTRITION_ENABLED=true` AND a saved profile: coach receives
      `context.nutrition` and the prompt contains the guidance block.
- [ ] Without a profile (user deferred onboarding): coach receives no
      nutrition slice and no chips appear.
- [ ] Quick-prompt chips don't render when their precondition is false.
- [ ] No new files outside the listed paths. No DB schema changes. No new
      Supabase tables.

---

## 5. Hard constraints (don't violate)

- **Local-first**: never query Supabase from the coach. Read IDB only.
- **Feature flag**: gate every new branch with `NUTRITION_ENABLED`.
- **No emojis** in code unless the user already has them.
- **No new docs** beyond what's specified — this handoff is the plan.
- **i18n**: every visible string in `translations.ts` for both `es` and `en`.
  Don't hardcode.
- **Don't bump the IDB version** — the profile lives in the existing `meta`
  store as JSON; pending adjustment too.
- **Don't touch** sync, onboarding, or NutritionView for this PR.

---

## 6. Out of scope

- Tools / function-calling for the coach (read-only in v1; doc 09 §9.5).
- A real `nutritionLogs` IDB store with the rich `MealLogEntry` shape
  (deferred — keep using the existing legacy entries store if you need
  daily totals).
- Refactoring `context-builder.ts` beyond adding the new slice.

---

## 7. Suggested commit / PR shape

One PR titled `feat(coach): wire nutrition profile + adjustment into AI context`.

Two or three commits:
1. `feat(coach): expose nutrition slice on UserCoachContext`
2. `feat(coach): add nutrition guidance to system prompt + quick chips`
3. `test(coach): cover nutrition context + prompt builder` (if not folded
   into the previous commits)

---

## 8. Files you will likely touch

```
src/lib/coach/context-builder.ts
src/lib/coach/context-builder.test.ts        (new)
src/lib/coach/prompts.ts
src/lib/coach/prompts.test.ts                (new)
src/components/workout/overlays/CoachSheet.tsx
src/lib/i18n/translations.ts
```

If you find yourself opening anything else, stop and reconsider — it is
probably out of scope.

---

## 9. After-merge checklist

- [ ] Run the schema SQL from `src/lib/supabase/schema.sql` in the Supabase
      SQL editor (only the `nutrition_profiles` block; rest is idempotent).
      This was already required from PR #3 and is not specific to this PR,
      but call it out so the user remembers.
- [ ] Smoke test in the browser: complete onboarding → open coach → ask
      "What should I eat tonight?" → answer cites the user's macros.
