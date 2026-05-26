import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { apiFetch } from './api';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const tokenKey = 'whats_internal_token';
const userKey = 'whats_internal_user';

function readStoredUser() {
  const value = localStorage.getItem(userKey);
  return value ? (JSON.parse(value) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      async login(username, password) {
        const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        localStorage.setItem(tokenKey, data.token);
        localStorage.setItem(userKey, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      },
      logout() {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        setToken(null);
        setUser(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}
