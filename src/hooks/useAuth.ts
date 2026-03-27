'use client';

import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
}

export interface AuthActions {
  signInAnonymously: () => Promise<{ error: string | null }>;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Check for env vars — gracefully degrade when Supabase isn't configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setIsLoading(false);
      return;
    }

    const sb = getSupabaseClient();

    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
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
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async (): Promise<void> => {
    const sb = getSupabaseClient();
    await sb.auth.signOut();
  };

  const isAnonymous = !!user && !user.email && user.is_anonymous === true;

  return { user, session, isLoading, isAnonymous, signInAnonymously, signInWithEmail, signOut };
}
