import { getDB } from './index';
import type { MetaRecord } from './schema';

export async function loadMetaValue(key: string): Promise<string | null> {
  const db = await getDB();
  const record = await db.get('meta', key);
  return record?.value ?? null;
}

export async function saveMetaValue(key: string, value: string): Promise<void> {
  const db = await getDB();
  const record: MetaRecord = { key, value };
  await db.put('meta', record);
}

export async function deleteMetaValue(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('meta', key);
}
