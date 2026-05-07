'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NUTRITION_ENABLED } from '@/lib/feature-flags';
import { loadMetaValue } from '@/lib/db/meta';
import {
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_DEFERRED_KEY,
} from '@/lib/db/nutritionProfile';

interface UseOnboardingGateArgs {
  userId: string | null | undefined;
  isLoadingAuth: boolean;
  isHydrated: boolean;
}

/**
 * Redirects new authenticated users to /onboarding when they haven't
 * completed or deferred the wizard. No-ops for anonymous users, while
 * auth/IDB are loading, when the feature flag is off, or when already
 * sitting on /onboarding.
 */
export function useOnboardingGate({
  userId,
  isLoadingAuth,
  isHydrated,
}: UseOnboardingGateArgs): void {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!NUTRITION_ENABLED) return;
    if (isLoadingAuth || !isHydrated) return;
    if (!userId) return;
    if (pathname?.startsWith('/onboarding')) return;

    let cancelled = false;
    (async () => {
      const [completed, deferred] = await Promise.all([
        loadMetaValue(ONBOARDING_COMPLETED_KEY),
        loadMetaValue(ONBOARDING_DEFERRED_KEY),
      ]);
      if (cancelled) return;
      if (!completed && !deferred) {
        router.replace('/onboarding');
      }
    })().catch((err) => {
      // Don't block the app if IDB hiccups; user can still use it.
      console.error('[OnboardingGate] failed to read meta', err);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, isLoadingAuth, isHydrated, pathname, router]);
}
