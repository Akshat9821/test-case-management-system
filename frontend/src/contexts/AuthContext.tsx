import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'test-lead' | 'tester' | 'read-only';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

// Debug logging
console.log('🔧 API Configuration:');
console.log('  VITE_API_URL env var:', import.meta.env.VITE_API_URL);
console.log('  Using API_URL:', API_URL);
console.log('  Current origin:', window.location.origin);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user info
      axios.get(`${API_URL}/auth/me`)
        .then(response => setUser(response.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        });
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const loginUrl = `${API_URL}/auth/login`;
    console.log('🔐 Attempting login to:', loginUrl);

    try {
      const response = await axios.post(loginUrl, { email, password });
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);
      console.log('✅ Login successful');
      return userData;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('  Error type:', error.constructor.name);
      console.error('  Error message:', error.message);
      console.error('  Response status:', error.response?.status);
      console.error('  Response data:', error.response?.data);
      console.error('  Request URL:', error.config?.url);

      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(error.message || 'Login failed');
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const response = await axios.post(`${API_URL}/auth/register`, { email, password, name });
    const { token: newToken, user: userData } = response.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const hasRole = useCallback((roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

