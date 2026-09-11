import { getServerSupabaseClient } from './client';

export interface VerifiedSupabaseUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
  created_at?: string;
}

/**
 * Server-Side Supabase Authentication verification helper.
 * Validates Supabase access tokens securely on the backend.
 */
export const serverSupabaseAuth = {
  /**
   * Check if server-side Supabase configuration is ready.
   */
  isConfigured(): boolean {
    return getServerSupabaseClient() !== null;
  },

  /**
   * Verify a Supabase JWT Bearer token on the backend.
   */
  async verifyToken(token: string): Promise<VerifiedSupabaseUser | null> {
    const client = getServerSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at,
      };
    } catch {
      return null;
    }
  },
};
