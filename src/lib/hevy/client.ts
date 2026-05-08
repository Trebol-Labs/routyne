import 'server-only';
import type { HevyWorkoutsPage } from './types';

const HEVY_API_BASE = 'https://api.hevyapp.com/v1';

export class HevyApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HevyApiError';
  }
}

function getApiKey(): string {
  const key = process.env.HEVY_API_KEY;
  if (!key) {
    throw new HevyApiError(500, 'HEVY_API_KEY is not configured');
  }
  return key;
}

async function hevyFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${HEVY_API_BASE}${path}`, {
    headers: {
      'api-key': getApiKey(),
      accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HevyApiError(res.status, `Hevy API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function fetchWorkoutsPage(
  page: number,
  pageSize = 10
): Promise<HevyWorkoutsPage> {
  return hevyFetch<HevyWorkoutsPage>(
    `/workouts?page=${page}&pageSize=${pageSize}`
  );
}
