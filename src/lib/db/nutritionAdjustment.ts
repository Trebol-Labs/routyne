// Storage for the latest pending kcal adjustment + cooldown timestamp.
// Single pending adjustment at a time; persisted as JSON in `meta`.

import { loadMetaValue, saveMetaValue, deleteMetaValue } from './meta';
import type { AdjustmentReason } from '@/lib/nutrition/adaptive';

const PENDING_KEY = 'nutrition.pendingAdjustment';
const LAST_COMPUTE_KEY = 'nutrition.lastAdjustmentCheck';

export const ADJUSTMENT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface PendingAdjustment {
  computedAt: string;
  reason: AdjustmentReason;
  weeklyWeightChangePct: number;
  previousTargetKcal: number;
  suggestedTargetKcal: number;
  deltaKcal: number;
}

export async function loadPendingAdjustment(): Promise<PendingAdjustment | null> {
  const raw = await loadMetaValue(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAdjustment;
  } catch {
    return null;
  }
}

export async function savePendingAdjustment(adj: PendingAdjustment): Promise<void> {
  await saveMetaValue(PENDING_KEY, JSON.stringify(adj));
}

export async function clearPendingAdjustment(): Promise<void> {
  await deleteMetaValue(PENDING_KEY);
}

export async function loadLastAdjustmentCheck(): Promise<number | null> {
  const raw = await loadMetaValue(LAST_COMPUTE_KEY);
  if (!raw) return null;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

export async function saveLastAdjustmentCheck(ts: number): Promise<void> {
  await saveMetaValue(LAST_COMPUTE_KEY, String(ts));
}

/** True when at least ADJUSTMENT_COOLDOWN_MS has passed since the last compute. */
export async function isAdjustmentCooldownPassed(now = Date.now()): Promise<boolean> {
  const last = await loadLastAdjustmentCheck();
  if (last === null) return true;
  return now - last >= ADJUSTMENT_COOLDOWN_MS;
}
