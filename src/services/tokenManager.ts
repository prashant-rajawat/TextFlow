/**
 * Client-side session token manager.
 * Stores the active JWT auth token in memory and sessionStorage.
 * Avoids insecure long-lived localStorage persistence while preserving tab sessions across reloads.
 */

const TOKEN_KEY = 'textflow_session_token';
let inMemoryToken: string | null = null;

export const tokenManager = {
  /**
   * Get current auth token from memory or sessionStorage.
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
      // Storage access blocked or restricted
    }
    return null;
  },

  /**
   * Store new auth token in memory and sessionStorage.
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
  },

  /**
   * Construct headers object with Authorization Bearer token if available.
   */
  getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };
    const token = this.getToken();
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },
};
