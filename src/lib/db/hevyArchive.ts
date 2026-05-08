import { loadMetaValue, saveMetaValue } from './meta';
import type { HevyAthleteDigest } from '@/lib/hevy/digest';
import type { HevyWorkout } from '@/lib/hevy/types';

export const HEVY_RAW_KEY = 'hevy:archive:raw';
export const HEVY_DIGEST_KEY = 'hevy:archive:digest';
export const HEVY_IMPORTED_AT_KEY = 'hevy:archive:importedAt';

export interface HevyArchiveSnapshot {
  rawWorkouts: HevyWorkout[];
  digest: HevyAthleteDigest;
  importedAt: string;
}

function parseWorkouts(raw: string | null): HevyWorkout[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as HevyWorkout[]) : [];
  } catch {
    return [];
  }
}

function parseDigest(raw: string | null): HevyAthleteDigest | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HevyAthleteDigest;
  } catch {
    return null;
  }
}

export async function persistHevyArchiveLocal(snapshot: HevyArchiveSnapshot): Promise<void> {
  await Promise.all([
    saveMetaValue(HEVY_RAW_KEY, JSON.stringify(snapshot.rawWorkouts)),
    saveMetaValue(HEVY_DIGEST_KEY, JSON.stringify(snapshot.digest)),
    saveMetaValue(HEVY_IMPORTED_AT_KEY, snapshot.importedAt),
  ]);
}

export async function loadHevyArchiveSnapshot(): Promise<HevyArchiveSnapshot | null> {
  const [raw, digestRaw, importedAt] = await Promise.all([
    loadMetaValue(HEVY_RAW_KEY),
    loadMetaValue(HEVY_DIGEST_KEY),
    loadMetaValue(HEVY_IMPORTED_AT_KEY),
  ]);

  const digest = parseDigest(digestRaw);
  if (!digest || !importedAt) {
    return null;
  }

  return {
    rawWorkouts: parseWorkouts(raw),
    digest,
    importedAt,
  };
}

export async function loadHevyDigest(): Promise<HevyAthleteDigest | null> {
  const raw = await loadMetaValue(HEVY_DIGEST_KEY);
  return parseDigest(raw);
}

export async function loadHevyImportedAt(): Promise<string | null> {
  return loadMetaValue(HEVY_IMPORTED_AT_KEY);
}
