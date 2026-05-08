import type { CapacitorConfig } from '@capacitor/cli';
import { DEFAULT_NATIVE_APP_ID, SITE_HOST, SITE_URL } from './src/lib/site';

function parseHost(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

const supabaseHost = parseHost(process.env.NEXT_PUBLIC_SUPABASE_URL);
const allowNavigation = Array.from(new Set([
  SITE_HOST,
  parseHost(process.env.CAPACITOR_SERVER_URL) ?? SITE_HOST,
  supabaseHost,
  'accounts.google.com',
  'oauth2.googleapis.com',
  'www.googleapis.com',
].filter((value): value is string => !!value)));

const config: CapacitorConfig = {
  appId: DEFAULT_NATIVE_APP_ID,
  appName: 'Routyne',
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? SITE_URL,
    cleartext: false,
    allowNavigation,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
