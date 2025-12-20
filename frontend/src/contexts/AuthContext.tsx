import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface QuotaInfo {
  used: number;
  total: number;
  remaining: number;
  resetAt: Date;
}

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  quota: QuotaInfo | null;
  login: (email: string, recaptchaToken: string) => Promise<void>;
  setAuthFromCallback: (token: string, email: string) => void;
  logout: () => void;
  refreshQuota: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  const logout = () => {
    setToken(null);
    setUser(null);
    setQuota(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  // Setup axios interceptor to handle 401/403 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Auto-logout on authentication errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Authentication error detected, logging out...');
          logout();
        }
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Load auth from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      refreshQuotaWithToken(storedToken);
    }
  }, []);

  const login = async (email: string, recaptchaToken: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        recaptchaToken,
      });

      const { token: authToken, user: userData, quota: quotaData } = response.data;

      setToken(authToken);
      setUser(userData);
      setQuota(quotaData);

      localStorage.setItem('authToken', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const setAuthFromCallback = (authToken: string, email: string) => {
    const userData = { id: email, email }; // Will get proper user ID from token validation

    setToken(authToken);
    setUser(userData);

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));

    // Fetch quota after auth
    refreshQuotaWithToken(authToken);
  };

  const refreshQuotaWithToken = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/auth/quota`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setQuota(response.data.quota);
    } catch (error: any) {
      console.error('Quota check error:', error.response?.data?.error || error.message);
      // Don't logout on quota refresh errors - just silently fail
      // The quota display will just show stale data
    }
  };

  const refreshQuota = async () => {
    if (token) {
      await refreshQuotaWithToken(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        quota,
        login,
        setAuthFromCallback,
        logout,
        refreshQuota,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
