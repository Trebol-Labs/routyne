import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/client';

type PushSubscriptionRow = Database['public']['Tables']['push_subscriptions']['Row'];
type PushSubscriptionInsert = Database['public']['Tables']['push_subscriptions']['Insert'];
type PushSubscriptionError = { message: string };

type PushSubscriptionQueryResult = Promise<{
  error: PushSubscriptionError | null;
}>;

type PushSubscriptionSelectResult = Promise<{
  data: PushSubscriptionRow[] | null;
  error: PushSubscriptionError | null;
}>;

interface PushSubscriptionsTable {
  upsert(
    values: PushSubscriptionInsert | PushSubscriptionInsert[],
    options?: { onConflict?: string }
  ): PushSubscriptionQueryResult;
  delete(): {
    eq(column: 'user_id', value: string): {
      eq(column: 'endpoint', value: string): PushSubscriptionQueryResult;
    };
  };
  select(columns?: string): PushSubscriptionSelectResult;
  update(values: Partial<PushSubscriptionRow>): {
    eq(column: 'user_id', value: string): {
      eq(column: 'endpoint', value: string): PushSubscriptionQueryResult;
    };
  };
}

function getServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase service role is not configured');
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function pushSubscriptionsTable() {
  const sb = getServiceSupabaseClient();
  return sb.from('push_subscriptions' as keyof Database['public']['Tables']) as unknown as PushSubscriptionsTable;
}

export async function getUserIdFromBearerToken(authorization: string | null): Promise<string | null> {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  const sb = getServiceSupabaseClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function upsertPushSubscriptionRow(
  userId: string,
  subscription: PushSubscriptionInsert
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await pushSubscriptionsTable().upsert(
    {
      ...subscription,
      user_id: userId,
      updated_at: now,
      last_sent_at: null,
    },
    { onConflict: 'user_id,endpoint' }
  );
  if (error) {
    throw new Error(`[Push] upsert subscription failed: ${error.message}`);
  }
}

export async function deletePushSubscriptionRow(userId: string, endpoint: string): Promise<void> {
  const { error } = await pushSubscriptionsTable()
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
  if (error) {
    throw new Error(`[Push] delete subscription failed: ${error.message}`);
  }
}

export async function loadAllPushSubscriptionRows(): Promise<PushSubscriptionRow[]> {
  const { data, error } = await pushSubscriptionsTable().select('*');
  if (error) {
    throw new Error(`[Push] list subscriptions failed: ${error.message}`);
  }

  return (data ?? []) as PushSubscriptionRow[];
}

export async function loadPushSubscriptionRowsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  const { data, error } = await pushSubscriptionsTable().select('*');
  if (error) {
    throw new Error(`[Push] list user subscriptions failed: ${error.message}`);
  }

  return (data ?? []).filter((row) => row.user_id === userId);
}

export async function markPushSubscriptionSent(userId: string, endpoint: string): Promise<void> {
  const { error } = await pushSubscriptionsTable()
    .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
  if (error) {
    throw new Error(`[Push] mark sent failed: ${error.message}`);
  }
}

export async function deleteStalePushSubscription(userId: string, endpoint: string): Promise<void> {
  await deletePushSubscriptionRow(userId, endpoint);
}
