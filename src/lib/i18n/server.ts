import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, normalizeLanguage } from './language';

export async function getServerLanguage(): Promise<'es' | 'en'> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANGUAGE_COOKIE)?.value;
  return normalizeLanguage(value ?? DEFAULT_LANGUAGE);
}
