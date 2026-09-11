import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvUrl = () =>
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_PROJECT_URL ||
  '';

const getEnvKey = () =>
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

/**
 * Reusable client-side Supabase client.
 * Lazy initialization prevents runtime crashes if env vars are missing before setup.
 */
let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance) {
    return clientInstance;
  }

  const url = getEnvUrl();
  const key = getEnvKey();

  if (!url || !key || url.trim() === '' || key.trim() === '') {
    return null;
  }

  try {
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return clientInstance;
  } catch (err) {
    console.warn('[Supabase Client] Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Direct export for convenient usage.
 */
export const supabase = getSupabaseClient();
