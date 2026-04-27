/**
 * Sync mutation queue — persisted in IDB syncQueue store.
 * Mutations are enqueued locally and drained by syncEngine when online + authenticated.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDB } from '@/lib/db/index';
import type { SyncMutationRecord } from '@/lib/db/schema';

export type { SyncMutationRecord as SyncMutation };

// ── Write ──────────────────────────────────────────────────────────────────────

export async function enqueue(
  mutation: Pick<SyncMutationRecord, 'table' | 'operation' | 'payload'>
): Promise<void> {
  const db = await getDB();
  const record: SyncMutationRecord = {
    id: uuidv4(),
    ...mutation,
    timestamp: Date.now(),
    retries: 0,
  };
  await db.add('syncQueue', record);
}

export async function dequeue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get('syncQueue', id);
  if (!record) return;
  await db.put('syncQueue', { ...record, retries: record.retries + 1 });
}

// ── Read ───────────────────────────────────────────────────────────────────────

/** Returns all pending mutations ordered by timestamp ascending. */
export async function getPendingMutations(): Promise<SyncMutationRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('syncQueue', 'by-timestamp');
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count('syncQueue');
}

/** Remove all mutations older than maxRetries (prevents infinite retry storms). */
export async function pruneFailedMutations(maxRetries = 5): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('syncQueue');
  await Promise.all(
    all
      .filter((m) => m.retries >= maxRetries)
      .map((m) => db.delete('syncQueue', m.id))
  );
}
