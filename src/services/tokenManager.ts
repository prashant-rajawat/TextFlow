/**
 * Client-side session token manager.
 * Stores the active JWT / Supabase auth token in memory, sessionStorage, and localStorage.
 * Automatically extracts the active token from Supabase Auth storage if present.
 */
import { getSupabaseClient } from '../lib/supabase';

const TOKEN_KEY = 'textflow_session_token';
let inMemoryToken: string | null = null;

export const tokenManager = {
  /**
   * Get current auth token from memory, sessionStorage, localStorage, or Supabase client storage.
   */
  getToken(): string | null {
    if (inMemoryToken) {
      return inMemoryToken;
    }

    try {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (stored) {
        inMemoryToken = stored;
        return stored;
      }
    } catch {
      // Storage access blocked
    }

    try {
      const storedLocal = localStorage.getItem(TOKEN_KEY);
      if (storedLocal) {
        inMemoryToken = storedLocal;
        return storedLocal;
      }
    } catch {
      // Storage access blocked
    }

    // Inspect localStorage for Supabase Auth keys (e.g. sb-<project_id>-auth-token)
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.access_token) {
                inMemoryToken = parsed.access_token;
                return parsed.access_token;
              }
            }
          }
        }
      }
    } catch {
      // Ignore JSON parse / storage errors
    }

    return null;
  },

  /**
   * Asynchronously retrieves the latest valid token, querying the active Supabase session if needed.
   */
  async getAccessToken(): Promise<string | null> {
    const existing = this.getToken();
    if (existing) {
      return existing;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          this.setToken(data.session.access_token);
          return data.session.access_token;
        }
      } catch {
        // Fall back to stored token
      }
    }

    return this.getToken();
  },

  /**
   * Store new auth token in memory, sessionStorage, and localStorage.
   */
  setToken(token: string | null | undefined): void {
    if (!token) {
      this.clearToken();
      return;
    }
    inMemoryToken = token;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage access restricted
    }
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage access restricted
    }
  },

  /**
   * Clear session auth token.
   */
  clearToken(): void {
    inMemoryToken = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Construct headers object with Authorization Bearer token synchronously if available.
   */
  getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };
    const token = this.getToken();
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  /**
   * Construct headers object with Authorization Bearer token asynchronously, guaranteeing session refresh.
   */
  async getAuthHeadersAsync(customHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...customHeaders };
    const token = await this.getAccessToken();
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },
};

