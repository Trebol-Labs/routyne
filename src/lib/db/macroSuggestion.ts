// Persisted cooldown for the legacy macro suggestion banner.

import { deleteMetaValue, loadMetaValue, saveMetaValue } from './meta';

export const MACRO_SUGGESTION_DISMISSED_KEY = 'nutrition.macroSuggestion.dismissedAt';
export const ADJUST_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export async function loadSuggestionDismissedAt(): Promise<number | null> {
  const raw = await loadMetaValue(MACRO_SUGGESTION_DISMISSED_KEY);
  if (!raw) return null;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

export async function saveSuggestionDismissedAt(ts = Date.now()): Promise<void> {
  await saveMetaValue(MACRO_SUGGESTION_DISMISSED_KEY, String(ts));
}

export async function clearSuggestionDismissedAt(): Promise<void> {
  await deleteMetaValue(MACRO_SUGGESTION_DISMISSED_KEY);
}

export async function isSuggestionCooldownPassed(now = Date.now()): Promise<boolean> {
  const last = await loadSuggestionDismissedAt();
  if (last === null) return true;
  return now - last >= ADJUST_COOLDOWN_MS;
}
