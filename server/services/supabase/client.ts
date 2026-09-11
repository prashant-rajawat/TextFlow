import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverSupabaseClient: SupabaseClient | null = null;

/**
 * Returns the server-side Supabase client instance.
 * Uses SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for admin ops).
 * Strictly server-side only; never sent to the browser.
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  if (serverSupabaseClient) {
    return serverSupabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !apiKey || supabaseUrl.trim() === '' || apiKey.trim() === '') {
    return null;
  }

  try {
    serverSupabaseClient = createClient(supabaseUrl, apiKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return serverSupabaseClient;
  } catch (error) {
    console.warn('[Supabase Server] Failed to initialize server-side Supabase client:', error);
    return null;
  }
}
