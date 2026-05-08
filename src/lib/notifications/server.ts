import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/client';

type NotificationDeviceRow = Database['public']['Tables']['notification_devices']['Row'];
type NotificationDeviceInsert = Database['public']['Tables']['notification_devices']['Insert'];
type NotificationDeviceError = { message: string };

interface NotificationDevicesTable {
  upsert(
    values: NotificationDeviceInsert | NotificationDeviceInsert[],
    options?: { onConflict?: string }
  ): Promise<{ error: NotificationDeviceError | null }>;
  delete(): {
    eq(column: 'user_id', value: string): {
      eq(column: 'device_id', value: string): Promise<{ error: NotificationDeviceError | null }>;
    };
  };
  select(columns?: string): Promise<{ data: NotificationDeviceRow[] | null; error: NotificationDeviceError | null }>;
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

function notificationDevicesTable(): NotificationDevicesTable {
  const sb = getServiceSupabaseClient();
  return sb.from('notification_devices' as keyof Database['public']['Tables']) as unknown as NotificationDevicesTable;
}

export async function upsertNotificationDeviceRow(
  userId: string,
  device: NotificationDeviceInsert
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await notificationDevicesTable().upsert(
    {
      ...device,
      user_id: userId,
      updated_at: now,
      last_seen_at: now,
      disabled_at: null,
    },
    { onConflict: 'device_id' }
  );

  if (error) {
    throw new Error(`[Notifications] upsert device failed: ${error.message}`);
  }
}

export async function deleteNotificationDeviceRow(userId: string, deviceId: string): Promise<void> {
  const { error } = await notificationDevicesTable()
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId);

  if (error) {
    throw new Error(`[Notifications] delete device failed: ${error.message}`);
  }
}

export async function loadNotificationDeviceRowsForUser(userId: string): Promise<NotificationDeviceRow[]> {
  const { data, error } = await notificationDevicesTable().select('*');
  if (error) {
    throw new Error(`[Notifications] list devices failed: ${error.message}`);
  }

  return (data ?? []).filter((row) => row.user_id === userId);
}
