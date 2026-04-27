import { getDB } from './index';
import type { ProfileRecord } from './schema';
import type { UserProfile, UserProfilePreferences } from '@/types/workout';

const PROFILE_KEY = 'profile' as const;
const EPOCH = new Date(0).toISOString();

export const DEFAULT_PROFILE_PREFERENCES: UserProfilePreferences = {
  trainingGoal: 'strength',
  experienceLevel: 'beginner',
  weekStartsOn: 1,
  effortTracking: 'both',
  coachTone: 'supportive',
  accentColor: 'blue',
  uiDensity: 'comfortable',
  motionLevel: 'system',
};

export const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Atleta',
  avatarEmoji: '💪',
  weightUnit: 'kg',
  heightCm: null,
  defaultRestSeconds: 90,
  restDays: [],
  preferences: { ...DEFAULT_PROFILE_PREFERENCES },
  updatedAt: EPOCH,
};

function normalizePreferences(
  preferences: ProfileRecord['preferences']
): UserProfilePreferences {
  return {
    ...DEFAULT_PROFILE_PREFERENCES,
    ...(preferences ?? {}),
  } as UserProfilePreferences;
}

export function normalizeProfileRecord(record: ProfileRecord | null | undefined): UserProfile {
  if (!record) {
    return { ...DEFAULT_PROFILE, preferences: { ...DEFAULT_PROFILE.preferences } };
  }

  const {
    displayName,
    avatarEmoji,
    weightUnit,
    heightCm,
    defaultRestSeconds,
    restDays,
    preferences,
    updatedAt,
  } = record;

  return {
    displayName: displayName ?? DEFAULT_PROFILE.displayName,
    avatarEmoji: avatarEmoji ?? DEFAULT_PROFILE.avatarEmoji,
    weightUnit: weightUnit ?? DEFAULT_PROFILE.weightUnit,
    heightCm: heightCm ?? DEFAULT_PROFILE.heightCm,
    defaultRestSeconds: defaultRestSeconds ?? DEFAULT_PROFILE.defaultRestSeconds,
    restDays: restDays ?? [],
    preferences: normalizePreferences(preferences),
    updatedAt: updatedAt ?? EPOCH,
  };
}

export async function loadProfile(): Promise<UserProfile> {
  const db = await getDB();
  const record = await db.get('profile', PROFILE_KEY);
  return normalizeProfileRecord(record ?? null);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', {
    id: PROFILE_KEY,
    displayName: profile.displayName,
    avatarEmoji: profile.avatarEmoji,
    weightUnit: profile.weightUnit,
    heightCm: profile.heightCm,
    defaultRestSeconds: profile.defaultRestSeconds,
    restDays: profile.restDays,
    preferences: { ...profile.preferences },
    updatedAt: profile.updatedAt,
  });
}
