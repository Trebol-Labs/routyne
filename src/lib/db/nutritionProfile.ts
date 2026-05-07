// Persistence for the rich NutritionProfile (Tier 1 + Tier 2 onboarding data).
// Stored as JSON inside the existing `meta` store to avoid an IDB schema bump.

import { loadMetaValue, saveMetaValue } from './meta';
import { enqueue } from '@/lib/sync/queue';
import type { NutritionProfile } from '@/types/nutrition';

export const NUTRITION_PROFILE_META_KEY = 'nutrition.profile';
export const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
export const ONBOARDING_DEFERRED_KEY = 'onboardingDeferred';
export const NUTRITION_DISABLED_KEY = 'nutritionDisabled';

export async function loadNutritionProfile(): Promise<NutritionProfile | null> {
  const raw = await loadMetaValue(NUTRITION_PROFILE_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NutritionProfile;
  } catch {
    return null;
  }
}

/**
 * Persists locally AND enqueues a sync mutation. Use everywhere except when
 * applying a merge from the remote (which would create an infinite loop).
 */
export async function saveNutritionProfile(profile: NutritionProfile): Promise<void> {
  await persistNutritionProfileSilently(profile);
  await enqueue({
    table: 'nutritionProfile',
    operation: 'upsert',
    payload: profile,
  });
}

/**
 * Local-only write, used by the sync merge path so we don't re-enqueue
 * mutations that just came from the cloud.
 */
export async function persistNutritionProfileSilently(profile: NutritionProfile): Promise<void> {
  await saveMetaValue(NUTRITION_PROFILE_META_KEY, JSON.stringify(profile));
}

export async function markOnboardingCompleted(): Promise<void> {
  await saveMetaValue(ONBOARDING_COMPLETED_KEY, new Date().toISOString());
}

export async function markOnboardingDeferred(): Promise<void> {
  await saveMetaValue(ONBOARDING_DEFERRED_KEY, new Date().toISOString());
}

export async function markNutritionDisabled(): Promise<void> {
  await saveMetaValue(NUTRITION_DISABLED_KEY, 'true');
}

export async function isOnboardingCompleted(): Promise<boolean> {
  return (await loadMetaValue(ONBOARDING_COMPLETED_KEY)) !== null;
}

export async function isOnboardingDeferred(): Promise<boolean> {
  return (await loadMetaValue(ONBOARDING_DEFERRED_KEY)) !== null;
}
