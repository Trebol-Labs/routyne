'use client';

import { saveMetaValue, loadMetaValue } from '@/lib/db/meta';
import { getSupabaseClient } from '@/lib/supabase/client';
import { computeHevyDigest, type HevyAthleteDigest } from './digest';
import type { HevyWorkout } from './types';

/** IDB meta keys. */
export const HEVY_RAW_KEY = 'hevy:archive:raw';        // full raw HevyWorkout[] JSON
export const HEVY_DIGEST_KEY = 'hevy:archive:digest';  // computed digest JSON
export const HEVY_IMPORTED_AT_KEY = 'hevy:archive:importedAt';

interface ImportPageResponse {
  page: number;
  pageCount: number;
  workouts: HevyWorkout[];
}

export interface HevyMigrationProgress {
  page: number;
  pageCount: number;
  workouts: number;
}

export interface HevyMigrationResult {
  totalWorkouts: number;
  pages: number;
  digest: HevyAthleteDigest;
}

async function getAccessToken(): Promise<string> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.auth.getSession();
  if (error) throw new Error(`auth: ${error.message}`);
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  return token;
}

async function fetchPage(page: number, accessToken: string): Promise<ImportPageResponse> {
  const res = await fetch(`/api/hevy/import?page=${page}&pageSize=10`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error ?? '';
    } catch {}
    throw new Error(`Hevy migration failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return (await res.json()) as ImportPageResponse;
}

/**
 * Pull the entire Hevy training archive, compute the athlete digest, and store
 * both in IDB meta. Does NOT write to the workout history table — this is a
 * personal coach-context payload, not a list of past sessions in the app.
 *
 * Re-runnable: latest run replaces the previous archive.
 */
export async function migrateFromHevy(
  onProgress?: (p: HevyMigrationProgress) => void
): Promise<HevyMigrationResult> {
  const token = await getAccessToken();

  const first = await fetchPage(1, token);
  const totalPages = Math.max(1, first.pageCount);
  const allWorkouts: HevyWorkout[] = [...first.workouts];
  onProgress?.({ page: 1, pageCount: totalPages, workouts: allWorkouts.length });

  for (let page = 2; page <= totalPages; page += 1) {
    const data = await fetchPage(page, token);
    allWorkouts.push(...data.workouts);
    onProgress?.({ page, pageCount: totalPages, workouts: allWorkouts.length });
  }

  const digest = computeHevyDigest(allWorkouts);
  const importedAt = digest.importedAt;

  await saveMetaValue(HEVY_RAW_KEY, JSON.stringify(allWorkouts));
  await saveMetaValue(HEVY_DIGEST_KEY, JSON.stringify(digest));
  await saveMetaValue(HEVY_IMPORTED_AT_KEY, importedAt);

  return { totalWorkouts: allWorkouts.length, pages: totalPages, digest };
}

export async function loadHevyDigest(): Promise<HevyAthleteDigest | null> {
  const raw = await loadMetaValue(HEVY_DIGEST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HevyAthleteDigest;
  } catch {
    return null;
  }
}

export async function loadHevyImportedAt(): Promise<string | null> {
  return await loadMetaValue(HEVY_IMPORTED_AT_KEY);
}
