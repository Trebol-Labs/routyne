import { useEffect, useRef } from 'react';
import { useWorkoutStore } from '@/store/useWorkoutStore';

/**
 * Runs migration + IDB hydration once on mount.
 * Returns true when the store is ready.
 */
export function useHydration(): boolean {
  const hydrate = useWorkoutStore((s) => s.hydrate);
  const isHydrated = useWorkoutStore((s) => s.isHydrated);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    hydrate();
  }, [hydrate]);

  return isHydrated;
}
