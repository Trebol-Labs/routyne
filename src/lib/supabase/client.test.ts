import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateClient, mockCreateBrowserClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(() => ({ auth: {} })),
  mockCreateBrowserClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

import { getSupabaseClient, resetSupabaseClient } from './client';

describe('getSupabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    resetSupabaseClient();
  });

  it('uses the cookie-backed browser client in browser contexts so the server callback can finish PKCE', () => {
    getSupabaseClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key'
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
