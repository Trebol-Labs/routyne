import { getDB } from './index';
import type { ProfileRecord } from './schema';
import type { UserProfile } from '@/types/workout';

const PROFILE_KEY = 'profile' as const;

const DEFAULT_PROFILE: ProfileRecord = {
  id: PROFILE_KEY,
  displayName: 'Athlete',
  avatarEmoji: '💪',
  weightUnit: 'kg',
  heightCm: null,
  defaultRestSeconds: 90,
  restDays: [],
};

export async function loadProfile(): Promise<UserProfile> {
  const db = await getDB();
  const record = await db.get('profile', PROFILE_KEY);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  if (!record) { const { id: _id, ...defaults } = DEFAULT_PROFILE; return { restDays: [], ...defaults } as UserProfile; }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...profile } = record;
  return { restDays: [], ...profile } as UserProfile;  // default merge for old records
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', { id: PROFILE_KEY, ...profile });
}
