import { describe, expect, it } from 'vitest';
import { normalizeProfileRecord, DEFAULT_PROFILE_PREFERENCES } from './profile';
import type { ProfileRecord } from './schema';

function buildRecord(preferences: Record<string, unknown>): ProfileRecord {
  return {
    id: 'profile',
    displayName: 'Atleta',
    avatarEmoji: '💪',
    weightUnit: 'kg',
    heightCm: null,
    defaultRestSeconds: 90,
    restDays: [],
    preferences,
    updatedAt: new Date(0).toISOString(),
  } as ProfileRecord;
}

describe('normalizeProfileRecord — daily reminder preferences', () => {
  it('fills defaults for legacy profiles missing the new fields', () => {
    const profile = normalizeProfileRecord(buildRecord({ language: 'es' }));

    expect(profile.preferences.weightReminderEnabled).toBe(DEFAULT_PROFILE_PREFERENCES.weightReminderEnabled);
    expect(profile.preferences.weightReminderTime).toBe(DEFAULT_PROFILE_PREFERENCES.weightReminderTime);
    expect(profile.preferences.mealRemindersEnabled).toBe(DEFAULT_PROFILE_PREFERENCES.mealRemindersEnabled);
    expect(profile.preferences.mealReminderTimes).toEqual(DEFAULT_PROFILE_PREFERENCES.mealReminderTimes);
  });

  it('sanitizes meal reminder times: drops invalid, dedupes, sorts, caps at 8', () => {
    const profile = normalizeProfileRecord(buildRecord({
      mealRemindersEnabled: true,
      mealReminderTimes: ['20:00', '08:00', '08:00', '99:99', 'nope', '13:00'],
    }));

    expect(profile.preferences.mealReminderTimes).toEqual(['08:00', '13:00', '20:00']);
  });

  it('falls back to default meal times when value is not an array', () => {
    const profile = normalizeProfileRecord(buildRecord({ mealReminderTimes: 'invalid' }));
    expect(profile.preferences.mealReminderTimes).toEqual(DEFAULT_PROFILE_PREFERENCES.mealReminderTimes);
  });
});
