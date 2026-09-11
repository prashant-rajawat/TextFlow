import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginData, RegisterData } from '../types/auth';
import { getMeApi, loginApi, registerApi, logoutApi } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check current session on initial app render
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const currentUser = await getMeApi();
        if (isMounted) {
          if (currentUser) {
            setUser(currentUser);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (data: LoginData) => {
    setError(null);
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
  };

  const signup = async (data: RegisterData) => {
    setError(null);
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
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
    }
  };

  const clearError = () => setError(null);

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
