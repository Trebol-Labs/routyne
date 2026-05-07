'use client';

import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getAuthRedirectUrl } from '@/lib/site';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
}

export interface AuthActions {
  signInAnonymously: () => Promise<{ error: string | null }>;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Start loading only if Supabase is actually configured — avoids a setState in the effect early-return
  const [isLoading, setIsLoading] = useState(
    !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );

  useEffect(() => {
    let mounted = true;

    // Gracefully degrade when Supabase isn't configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }

    const sb = getSupabaseClient();

    sb.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('[Auth] getSession failed', error);
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    }).catch((error) => {
      if (!mounted) return;
      console.error('[Auth] getSession threw', error);
      setIsLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInAnonymously = async (): Promise<{ error: string | null }> => {
    const sb = getSupabaseClient();
    const { error } = await sb.auth.signInAnonymously();
    return { error: error?.message ?? null };
  };

  const signInWithEmail = async (email: string): Promise<{ error: string | null }> => {
    const sb = getSupabaseClient();
    const emailRedirectTo = getAuthRedirectUrl('/auth/callback');

    if (user?.is_anonymous) {
      const { error } = await sb.auth.updateUser(
        { email },
        { emailRedirectTo }
      );
      return { error: error?.message ?? null };
    }

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo,
      },
    });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    const sb = getSupabaseClient();
    const redirectTo = getAuthRedirectUrl('/auth/callback');
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async (): Promise<void> => {
    const sb = getSupabaseClient();
    await sb.auth.signOut();
  };

  const isAnonymous = !!user && !user.email && user.is_anonymous === true;

  return { user, session, isLoading, isAnonymous, signInAnonymously, signInWithEmail, signInWithGoogle, signOut };
}
