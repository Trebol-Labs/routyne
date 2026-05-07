import { getDB } from './index';
import type { ProfileRecord } from './schema';
import type {
  AccentColor,
  AppLanguage,
  CoachTone,
  EffortTrackingMode,
  ExperienceLevel,
  MotionLevel,
  TrainingGoal,
  UiDensity,
  UserProfile,
  UserProfilePreferences,
} from '@/types/workout';

const PROFILE_KEY = 'profile' as const;
const EPOCH = new Date(0).toISOString();

const DEFAULT_TIMEZONE = 'America/Bogota';

const TRAINING_GOALS: TrainingGoal[] = ['strength', 'hypertrophy', 'general', 'endurance'];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
const EFFORT_TRACKING_MODES: EffortTrackingMode[] = ['off', 'rpe', 'rir', 'both'];
const COACH_TONES: CoachTone[] = ['direct', 'supportive', 'technical'];
const ACCENT_COLORS: AccentColor[] = ['blue', 'emerald', 'orange', 'violet', 'mono'];
const UI_DENSITIES: UiDensity[] = ['comfortable', 'compact'];
const MOTION_LEVELS: MotionLevel[] = ['system', 'reduced', 'full'];
const LANGUAGES: AppLanguage[] = ['es', 'en'];

function isMember<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

export const DEFAULT_PROFILE_PREFERENCES: UserProfilePreferences = {
  trainingGoal: 'strength',
  experienceLevel: 'beginner',
  weekStartsOn: 1,
  effortTracking: 'both',
  coachTone: 'supportive',
  accentColor: 'blue',
  uiDensity: 'comfortable',
  motionLevel: 'system',
  reducedMotion: false,
  language: 'es',
  streakReminderEnabled: true,
  timerNotificationsEnabled: true,
  timezone: DEFAULT_TIMEZONE,
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
  const raw = preferences ?? {};
  const trainingGoal = isMember(raw.trainingGoal, TRAINING_GOALS) ? raw.trainingGoal : DEFAULT_PROFILE_PREFERENCES.trainingGoal;
  const experienceLevel = isMember(raw.experienceLevel, EXPERIENCE_LEVELS)
    ? raw.experienceLevel
    : DEFAULT_PROFILE_PREFERENCES.experienceLevel;
  const weekStartsOn = raw.weekStartsOn === 0 ? 0 : raw.weekStartsOn === 1 ? 1 : DEFAULT_PROFILE_PREFERENCES.weekStartsOn;
  const effortTracking = isMember(raw.effortTracking, EFFORT_TRACKING_MODES)
    ? raw.effortTracking
    : DEFAULT_PROFILE_PREFERENCES.effortTracking;
  const coachTone = isMember(raw.coachTone, COACH_TONES) ? raw.coachTone : DEFAULT_PROFILE_PREFERENCES.coachTone;
  const accentColor = isMember(raw.accentColor, ACCENT_COLORS) ? raw.accentColor : DEFAULT_PROFILE_PREFERENCES.accentColor;
  const uiDensity = isMember(raw.uiDensity, UI_DENSITIES) ? raw.uiDensity : DEFAULT_PROFILE_PREFERENCES.uiDensity;
  const motionLevel = isMember(raw.motionLevel, MOTION_LEVELS) ? raw.motionLevel : DEFAULT_PROFILE_PREFERENCES.motionLevel;
  const language = isMember(raw.language, LANGUAGES) ? raw.language : DEFAULT_PROFILE_PREFERENCES.language;
  const reducedMotion = typeof raw.reducedMotion === 'boolean'
    ? raw.reducedMotion
    : motionLevel === 'reduced';
  const streakReminderEnabled = typeof raw.streakReminderEnabled === 'boolean'
    ? raw.streakReminderEnabled
    : DEFAULT_PROFILE_PREFERENCES.streakReminderEnabled;
  const timerNotificationsEnabled = typeof raw.timerNotificationsEnabled === 'boolean'
    ? raw.timerNotificationsEnabled
    : DEFAULT_PROFILE_PREFERENCES.timerNotificationsEnabled;
  const timezone = typeof raw.timezone === 'string' && raw.timezone.trim()
    ? raw.timezone
    : DEFAULT_TIMEZONE;

  return {
    trainingGoal,
    experienceLevel,
    weekStartsOn,
    effortTracking,
    coachTone,
    accentColor,
    uiDensity,
    motionLevel,
    reducedMotion,
    language,
    streakReminderEnabled,
    timerNotificationsEnabled,
    timezone,
  };
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

  const normalizedPreferences = normalizePreferences(preferences);

  return {
    displayName: displayName ?? DEFAULT_PROFILE.displayName,
    avatarEmoji: avatarEmoji ?? DEFAULT_PROFILE.avatarEmoji,
    weightUnit: weightUnit ?? DEFAULT_PROFILE.weightUnit,
    heightCm: heightCm ?? DEFAULT_PROFILE.heightCm,
    defaultRestSeconds: defaultRestSeconds ?? DEFAULT_PROFILE.defaultRestSeconds,
    restDays: restDays ?? [],
    preferences: normalizedPreferences,
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
