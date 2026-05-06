import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInAnonymously = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInAnonymously: mockSignInAnonymously,
      signInWithOtp: mockSignInWithOtp,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  }),
}));

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1_700_000_000,
    user: {
      id: 'user-1',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
      email: 'person@example.com',
      ...overrides,
    },
  } as Session;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    window.history.replaceState({}, '', 'http://localhost:3000/');

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    });
    mockSignInAnonymously.mockResolvedValue({ error: null });
    mockSignInWithOtp.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('sends a magic link to the current app origin for signed-out users', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signInWithEmail('me@example.com');
    });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('upgrades anonymous users with updateUser instead of a new OTP sign-in', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: makeSession({
          email: undefined,
          is_anonymous: true,
        }),
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAnonymous).toBe(true));

    await act(async () => {
      await result.current.signInWithEmail('upgrade@example.com');
    });

    expect(mockUpdateUser).toHaveBeenCalledWith(
      { email: 'upgrade@example.com' },
      { emailRedirectTo: 'http://localhost:3000/auth/callback' }
    );
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });
});
