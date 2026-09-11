import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginData, RegisterData } from '../types/auth';
import { getMeApi, loginApi, registerApi, logoutApi } from '../services/authService';
import { supabaseAuth } from '../services/supabase/auth';
import { getSupabaseClient } from '../lib/supabase';
import { tokenManager } from '../services/tokenManager';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  message: string | null;
  clearMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function resolveSupabaseUser(sessionUser: any, supabaseClient: any): Promise<User> {
  let fullName =
    sessionUser.user_metadata?.name ||
    sessionUser.user_metadata?.full_name ||
    '';

  if (supabaseClient) {
    try {
      // Query profiles table directly from Supabase
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('full_name')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (profile?.full_name) {
        fullName = profile.full_name;
      }
    } catch {
      // Table may still be populating
    }
  }

  return {
    id: sessionUser.id,
    name: fullName || sessionUser.email?.split('@')[0] || 'User',
    email: sessionUser.email || '',
    createdAt: sessionUser.created_at,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Initialize session & listen to Supabase Auth state changes
  useEffect(() => {
    let isMounted = true;
    const client = getSupabaseClient();

    async function initializeSession() {
      if (client) {
        try {
          const { data } = await client.auth.getSession();
          if (data.session) {
            tokenManager.setToken(data.session.access_token);
            const authUser = await resolveSupabaseUser(data.session.user, client);
            if (isMounted) setUser(authUser);
          } else {
            // Check fallback backend session
            const backendUser = await getMeApi();
            if (isMounted) setUser(backendUser);
          }
        } catch (err) {
          if (isMounted) setUser(null);
        } finally {
          if (isMounted) setIsLoading(false);
        }

        // Subscribe to auth state changes (e.g. login, logout, token refresh)
        const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            tokenManager.setToken(session.access_token);
            const authUser = await resolveSupabaseUser(session.user, client);
            if (isMounted) setUser(authUser);
          } else if (event === 'SIGNED_OUT') {
            tokenManager.clearToken();
            if (isMounted) setUser(null);
          }
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      } else {
        // Fallback to backend JWT auth if Supabase environment variables are not set
        getMeApi()
          .then((currentUser) => {
            if (isMounted) setUser(currentUser);
          })
          .catch(() => {
            if (isMounted) setUser(null);
          })
          .finally(() => {
            if (isMounted) setIsLoading(false);
          });
      }
    }

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (data: LoginData) => {
    setError(null);
    setMessage(null);
    const client = getSupabaseClient();

    if (client) {
      try {
        const authData = await supabaseAuth.signIn(data.email, data.password);
        if (authData.session) {
          tokenManager.setToken(authData.session.access_token);
          const authUser = await resolveSupabaseUser(authData.user, client);
          setUser(authUser);
        }
      } catch (err: any) {
        // Fallback to backend authentication if Supabase signin throws or is unavailable
        try {
          const res = await loginApi(data);
          if (res.success && res.user) {
            setUser(res.user);
            return;
          }
        } catch {
          // Keep primary error message
        }
        setError(err.message || 'Invalid email or password.');
        throw err;
      }
    } else {
      try {
        const res = await loginApi(data);
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          throw new Error(res.message || 'Login failed.');
        }
      } catch (err: any) {
        setError(err.message || 'Invalid email or password.');
        throw err;
      }
    }
  };

  const signup = async (data: RegisterData) => {
    setError(null);
    setMessage(null);
    const client = getSupabaseClient();

    if (client) {
      try {
        const authData = await supabaseAuth.signUp(data.email, data.password, data.name);
        if (authData.session) {
          tokenManager.setToken(authData.session.access_token);
          const authUser = await resolveSupabaseUser(authData.user, client);
          setUser(authUser);
        } else if (authData.user) {
          setMessage('Account created! Please check your email to confirm registration.');
        }
      } catch (err: any) {
        // Fallback to backend registration if needed
        try {
          const res = await registerApi(data);
          if (res.success && res.user) {
            setUser(res.user);
            return;
          }
        } catch {
          // Keep primary error message
        }
        setError(err.message || 'An error occurred during account creation.');
        throw err;
      }
    } else {
      try {
        const res = await registerApi(data);
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          throw new Error(res.message || 'Registration failed.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during account creation.');
        throw err;
      }
    }
  };

  const logout = async () => {
    try {
      if (getSupabaseClient()) {
        await supabaseAuth.signOut();
      }
      await logoutApi();
    } finally {
      tokenManager.clearToken();
      setUser(null);
    }
  };

  const clearError = () => setError(null);
  const clearMessage = () => setMessage(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        error,
        clearError,
        message,
        clearMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
