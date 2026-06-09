import type { SyncMutationRecord } from '@/lib/db/schema';

function getEntityKey(mutation: SyncMutationRecord): string {
  if (mutation.table === 'profile' || mutation.table === 'nutritionProfile') {
    return mutation.table;
  }
  const payload = mutation.payload as any;
  if (mutation.table === 'bodyweight') {
    return `bodyweight:${payload.date}`;
  }
  return `${mutation.table}:${payload.id}`;
}

// Then:
// const groups = new Map<string, SyncMutationRecord[]>();
// for (const m of pending) {
//   const key = getEntityKey(m);
//   const group = groups.get(key) ?? [];
//   group.push(m);
//   groups.set(key, group);
// }
// const chains = Array.from(groups.values());
// for (const batch of chunk(chains, 10)) {
//   await Promise.all(batch.map(async (chain) => {
//     for (const m of chain) {
//       // apply mutation
//     }
//   }));
// }
