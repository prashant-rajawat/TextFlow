import { getSupabaseClient } from './client';

export interface SupabaseAuthUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Client-side Supabase Auth Wrapper.
 * Modular integration layer ready for Supabase Auth migration.
 */
export const supabaseAuth = {
  /**
   * Check if Supabase client-side Auth is configured.
   */
  isConfigured(): boolean {
    return getSupabaseClient() !== null;
  },

  /**
   * Get current Supabase session access token for Bearer forwarding.
   */
  async getAccessToken(): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data } = await client.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  },

  /**
   * Sign up user with Supabase Auth.
   */
  async signUp(email: string, password: string, name: string) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client authentication is not configured yet.');
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in user with Supabase Auth.
   */
  async signIn(email: string, password: string) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client authentication is not configured yet.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user.
   */
  async signOut() {
    const client = getSupabaseClient();
    if (!client) return;

    await client.auth.signOut().catch(() => null);
  },
};
