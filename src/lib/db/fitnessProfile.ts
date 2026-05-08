import { loadMetaValue, saveMetaValue, deleteMetaValue } from './meta';
import type { FitnessProfile } from '@/types/fitness';

export const FITNESS_PROFILE_META_KEY = 'fitness.profile';

export async function loadFitnessProfile(): Promise<FitnessProfile | null> {
  const raw = await loadMetaValue(FITNESS_PROFILE_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FitnessProfile;
  } catch {
    return null;
  }
}

export async function saveFitnessProfile(profile: FitnessProfile): Promise<void> {
  await saveMetaValue(FITNESS_PROFILE_META_KEY, JSON.stringify(profile));
}

export async function deleteFitnessProfile(): Promise<void> {
  await deleteMetaValue(FITNESS_PROFILE_META_KEY);
}
