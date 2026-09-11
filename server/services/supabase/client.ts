import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverSupabaseClient: SupabaseClient | null = null;

/**
 * Returns the server-side Supabase Admin client instance.
 * Uses SUPABASE_SERVICE_ROLE_KEY securely on the server only.
 * NEVER expose this to the browser or frontend bundle.
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  if (serverSupabaseClient) {
    return serverSupabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.trim() === '' || serviceRoleKey.trim() === '') {
    return null;
  }

  try {
    serverSupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return serverSupabaseClient;
  } catch (error) {
    console.warn('[Supabase Server] Failed to initialize server-side Supabase Admin SDK:', error);
    return null;
  }
}
