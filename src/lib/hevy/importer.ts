'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import { persistHevyArchiveLocal } from '@/lib/db/hevyArchive';
import { computeHevyDigest, type HevyAthleteDigest } from './digest';
import type { HevyWorkout } from './types';

/** IDB meta keys are owned by src/lib/db/hevyArchive.ts. */

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

async function getAccessToken(): Promise<{ accessToken: string; userId: string }> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.auth.getSession();
  if (error) {
    throw new Error(`auth: ${error.message}`);
  }
  const session = data.session;
  if (!session?.access_token || !session.user?.id) {
    throw new Error('Not signed in');
  }
  return { accessToken: session.access_token, userId: session.user.id };
}

async function fetchPage(page: number, accessToken: string): Promise<ImportPageResponse> {
  const res = await fetch(`/api/hevy/import?page=${page}&pageSize=10`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body?.error ?? '';
    } catch {
      detail = '';
    }
    throw new Error(`Hevy migration failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return (await res.json()) as ImportPageResponse;
}

/**
 * Pulls the entire Hevy archive, computes the digest, stores it locally, and
 * mirrors the same payload into Supabase for cloud coach access.
 */
export async function migrateFromHevy(
  onProgress?: (progress: HevyMigrationProgress) => void
): Promise<HevyMigrationResult> {
  const { accessToken, userId } = await getAccessToken();

  const first = await fetchPage(1, accessToken);
  const totalPages = Math.max(1, first.pageCount);
  const allWorkouts: HevyWorkout[] = [...first.workouts];
  onProgress?.({ page: 1, pageCount: totalPages, workouts: allWorkouts.length });

  for (let page = 2; page <= totalPages; page += 1) {
    const data = await fetchPage(page, accessToken);
    allWorkouts.push(...data.workouts);
    onProgress?.({ page, pageCount: totalPages, workouts: allWorkouts.length });
  }

  const digest = computeHevyDigest(allWorkouts);

  await persistHevyArchiveLocal({
    rawWorkouts: allWorkouts,
    digest,
    importedAt: digest.importedAt,
  });

  const sb = getSupabaseClient();
  const { error } = await sb.from('hevy_archives').upsert(
    {
      user_id: userId,
      raw_archive: allWorkouts,
      digest,
      imported_at: digest.importedAt,
      updated_at: digest.importedAt,
    } as never,
    { onConflict: 'user_id' }
  );
  if (error) {
    throw new Error(`Hevy cloud sync failed: ${error.message}`);
  }

  return { totalWorkouts: allWorkouts.length, pages: totalPages, digest };
}

export { loadHevyArchiveSnapshot, loadHevyDigest, loadHevyImportedAt } from '@/lib/db/hevyArchive';
