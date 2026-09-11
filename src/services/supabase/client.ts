import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns the browser/client-side Supabase client instance.
 * Lazy initialization prevents app crashes when Supabase credentials are not yet configured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabaseClient;
  } catch (error) {
    console.warn('[Supabase Client] Failed to initialize client-side Supabase SDK:', error);
    return null;
  }
}
