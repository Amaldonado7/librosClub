import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  userId: number;
  username: string;
  role: string;
  plan?: 'free' | 'premium';
}

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  username: string | null;
  plan: 'free' | 'premium' | null;
  isPremium: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): DecodedToken | null {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('libros_token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('libros_token');
      setToken(null);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('libros_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('libros_token');
    setToken(null);
  };

  const decoded = token ? decodeToken(token) : null;
  const plan = decoded?.plan ?? (token ? 'free' : null);
  const isPremium = plan === 'premium';

  return (
    <AuthContext.Provider value={{
      token,
      isAuthenticated: !!token,
      username: decoded?.username ?? null,
      plan,
      isPremium,
      login,
      logout,
    }}>
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
