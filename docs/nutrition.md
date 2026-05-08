# Nutrition

Routyne has a shipped nutrition surface, but it is intentionally split between legacy daily tracking and the newer rich profile/planner system.

## Feature Flag

`NEXT_PUBLIC_NUTRITION_ENABLED` defaults on. Set it to `false` to disable rich nutrition onboarding/profile flows.

The daily nutrition tab remains part of the app shell; the flag controls the rich onboarding/profile plan card and adaptive coach surfaces.

## Current Layers

### Legacy Daily Tracking

Files:

- [`src/lib/db/nutrition.ts`](/Users/sierra/Code/routyne/src/lib/db/nutrition.ts)
- [`src/store/useWorkoutStore.ts`](/Users/sierra/Code/routyne/src/store/useWorkoutStore.ts)
- [`src/components/workout/views/NutritionView.tsx`](/Users/sierra/Code/routyne/src/components/workout/views/NutritionView.tsx)

Stores:

- `nutritionEntries`: daily food entries by date.
- `nutritionGoals`: manual daily macro goal.

Behavior:

- Users can log meals, edit/delete local entries, and update daily macro goals.
- `NutritionView` groups entries by meal type and compares daily totals against the saved goal.
- These legacy stores are local-only today and are not part of the Supabase sync engine.
- The AI Coach receives the saved legacy nutrition goal as `nutritionGoal` in `UserCoachContext`.

### Rich Nutrition Profile

Files:

- [`src/app/onboarding/page.tsx`](/Users/sierra/Code/routyne/src/app/onboarding/page.tsx)
- [`src/components/nutrition/onboarding/`](/Users/sierra/Code/routyne/src/components/nutrition/onboarding)
- [`src/lib/db/nutritionProfile.ts`](/Users/sierra/Code/routyne/src/lib/db/nutritionProfile.ts)
- [`src/types/nutrition.ts`](/Users/sierra/Code/routyne/src/types/nutrition.ts)

Data:

- Tier 1: weight, height, age, sex, activity, goal, experience.
- Tier 2: body fat, training days/type/time, dietary restrictions, custom restrictions, and budget.
- Computed cache: BMR, TDEE, target kcal, protein, fats, carbs.

Persistence:

- Stored as JSON in the existing IDB `meta` store under `nutrition.profile`.
- Completion/defer/disable flags also live in `meta`.
- This avoids an IDB schema version bump.
- The rich profile syncs to Supabase `nutrition_profiles`.

## Onboarding Gate

[`src/hooks/useOnboardingGate.ts`](/Users/sierra/Code/routyne/src/hooks/useOnboardingGate.ts) redirects authenticated users to `/onboarding` when:

- Nutrition is enabled.
- Auth and IDB hydration are ready.
- The user has not completed or deferred onboarding.
- The user is not already on `/onboarding`.

Anonymous users are not redirected.

## Calculation Engine

[`src/lib/nutrition/calculations.ts`](/Users/sierra/Code/routyne/src/lib/nutrition/calculations.ts) is a pure engine with no DB, network, or React dependencies.

Exports:

- `calcBmr`: Mifflin-St Jeor by default, Katch-McArdle when valid body fat percentage exists.
- `calcTdee`: activity-factor multiplier.
- `calcTargetKcal`: goal and experience based target.
- `calcMacros`: protein/fat floors with carbs as the remaining performance variable.
- `buildMealPlan`: 4- or 5-meal distribution with pre/post-workout carb bias.
- `computeAll`: aggregate calculation plus warnings.

Warnings include high BMI estimation error, out-of-range body fat, aggressive deficit, and low carbs outside a cut.

## Block Planner

[`src/lib/nutrition/planner.ts`](/Users/sierra/Code/routyne/src/lib/nutrition/planner.ts) powers the "Objetivo por bloques" planner in `NutritionView`.

Inputs:

- Goal: `cut`, `gain`, or `recomp`.
- Experience level from the workout profile.
- Current weight, target weight, weight unit, and weeks.

Outputs:

- Target calories and macros.
- Maintenance estimate.
- Weekly rate percentage.
- Recommended week range.
- Pace label: `conservador`, `recomendado`, or `agresivo`.
- Summary and evidence copy.

Applying a planner recommendation updates the legacy daily `nutritionGoal`, not the rich nutrition profile.

## Adaptive Kcal Adjustment

Files:

- [`src/lib/nutrition/adaptive.ts`](/Users/sierra/Code/routyne/src/lib/nutrition/adaptive.ts)
- [`src/lib/db/nutritionAdjustment.ts`](/Users/sierra/Code/routyne/src/lib/db/nutritionAdjustment.ts)
- [`src/hooks/useAdaptiveCheck.ts`](/Users/sierra/Code/routyne/src/hooks/useAdaptiveCheck.ts)
- [`src/components/nutrition/AdjustmentBanner.tsx`](/Users/sierra/Code/routyne/src/components/nutrition/AdjustmentBanner.tsx)

Behavior:

- Requires at least 10 recent bodyweight records.
- Compares the average of the last 5 records with the previous 5.
- Uses goal-specific thresholds for cut, bulk, and recomp.
- Stores one pending adjustment at a time in IDB `meta`.
- Enforces a 7-day compute cooldown.
- Applying an adjustment updates the rich nutrition profile target kcal and macro cache, then clears the pending adjustment.
- Rejecting clears the pending adjustment without changing the profile.

## Supabase Sync

Rich nutrition profile sync is handled by:

- `nutritionProfileToRemote` and `mergeRemoteNutritionProfile` in [`src/lib/sync/merge.ts`](/Users/sierra/Code/routyne/src/lib/sync/merge.ts).
- Push/pull/bootstrap handling in [`src/lib/sync/syncEngine.ts`](/Users/sierra/Code/routyne/src/lib/sync/syncEngine.ts).
- DDL in [`src/lib/supabase/schema.sql`](/Users/sierra/Code/routyne/src/lib/supabase/schema.sql).

The sync engine tolerates a missing `nutrition_profiles` table by skipping nutrition-profile push/pull instead of failing the whole sync.

## AI Coach Boundary

The current AI Coach context includes the legacy saved nutrition goal from `useWorkoutStore` and an imported Hevy archive digest when present. It does not yet include:

- Rich onboarding nutrition profile.
- Meal plan from `computeAll`.
- Today's logged entries as an aggregate.
- Recent nutrition logs.
- Pending adaptive adjustment.
- Dietary restrictions.

If nutrition coaching is extended, keep the coach local-first: read IDB/local store only, do not query Supabase from the coach path.
