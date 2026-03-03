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
};

export async function loadProfile(): Promise<UserProfile> {
  const db = await getDB();
  const record = await db.get('profile', PROFILE_KEY);
  if (!record) return { ...DEFAULT_PROFILE };
  const { id: _id, ...profile } = record;
  return profile as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', { id: PROFILE_KEY, ...profile });
}
