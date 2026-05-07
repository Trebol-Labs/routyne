import type { AppLanguage } from '@/types/workout';

export const LANGUAGE_COOKIE = 'routyne-language';
export const LANGUAGE_STORAGE_KEY = 'routyne-language';
export const DEFAULT_LANGUAGE: AppLanguage = 'es';

export function normalizeLanguage(value: unknown): AppLanguage {
  return value === 'en' ? 'en' : 'es';
}

