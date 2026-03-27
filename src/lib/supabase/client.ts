import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      routines: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_md: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['routines']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['routines']['Insert']>;
      };
      history: {
        Row: {
          id: string;
          user_id: string;
          session_idx: number | null;
          session_title: string;
          completed_at: string;
          total_volume: number | null;
          duration_secs: number | null;
          volume_data: unknown;
          notes: string | null;
          deleted_at: string | null;
          synced_at: string;
        };
        Insert: Omit<Database['public']['Tables']['history']['Row'], 'synced_at'>;
        Update: Partial<Database['public']['Tables']['history']['Insert']>;
      };
      bodyweight: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          weight: number;
          unit: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bodyweight']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['bodyweight']['Insert']>;
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          avatar_emoji: string;
          weight_unit: string;
          height_cm: number | null;
          default_rest_s: number;
          rest_days: number[];
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      sync_cursors: {
        Row: { user_id: string; last_pulled: string; last_pushed: string };
        Insert: { user_id: string; last_pulled?: string; last_pushed?: string };
        Update: Partial<Database['public']['Tables']['sync_cursors']['Row']>;
      };
    };
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  _client = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // PWA — no server-side URL parsing needed
    },
  });

  return _client;
}

/** Only used in tests to reset the singleton. */
export function resetSupabaseClient(): void {
  _client = null;
}
