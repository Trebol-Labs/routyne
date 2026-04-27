export const DEFAULT_SITE_URL = 'https://routyne-nu.vercel.app';

function normalizeSiteUrl(value: string | undefined): string {
  const candidate = value?.trim() || DEFAULT_SITE_URL;

  try {
    return new URL(candidate).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const SITE_HOST = new URL(SITE_URL).host;
