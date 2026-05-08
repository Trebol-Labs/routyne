export const DEFAULT_SITE_URL = 'https://routyne-nu.vercel.app';
export const DEFAULT_NATIVE_AUTH_SCHEME = 'com.trebollabs.routyne';
export const DEFAULT_NATIVE_APP_ID = DEFAULT_NATIVE_AUTH_SCHEME;

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

export function isNativeCapacitorRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const capacitor = (window as Window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }).Capacitor;

  if (!capacitor) {
    return false;
  }

  try {
    if (typeof capacitor.isNativePlatform === 'function') {
      return capacitor.isNativePlatform();
    }
    if (typeof capacitor.getPlatform === 'function') {
      return capacitor.getPlatform() !== 'web';
    }
  } catch {
    return false;
  }

  return false;
}

function normalizeAuthPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }

  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return prefixed.replace(/\/{2,}/g, '/');
}

export function getAuthRedirectUrl(path = '/'): string {
  const normalizedPath = normalizeAuthPath(path);

  if (isNativeCapacitorRuntime()) {
    const nativePath = normalizedPath.replace(/^\/+/, '');
    return `${DEFAULT_NATIVE_AUTH_SCHEME}://${nativePath || 'auth/callback'}`;
  }

  const base = typeof window !== 'undefined'
    ? window.location.origin
    : SITE_URL;

  return new URL(normalizedPath, base).toString();
}

export function mapNativeAuthUrlToHostedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol.replace(':', '') !== DEFAULT_NATIVE_AUTH_SCHEME) {
    return null;
  }

  const pathname = parsed.pathname.replace(/^\/+/, '');
  const pathSegments = [parsed.hostname, pathname].filter(Boolean);
  const path = `/${pathSegments.join('/') || 'auth/callback'}`;
  const target = new URL(path, SITE_URL);
  target.search = parsed.search;
  target.hash = parsed.hash;
  return target.toString();
}
