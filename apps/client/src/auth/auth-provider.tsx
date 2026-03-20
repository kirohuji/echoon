import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from './auth-service';
import { STORAGE_KEY } from './constant';
import { isValidToken } from './utils';

type AuthUser = Record<string, any> & { accessToken: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  refresh: () => Promise<void>;
  signIn: (params: { phone: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = sessionStorage.getItem(STORAGE_KEY);
      if (accessToken && isValidToken(accessToken)) {
        const res = await authService.profile();
        const { user: u, profile } = res as any;
        setUser({ ...(u ?? {}), ...(profile ?? {}), accessToken });
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('auth refresh failed', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async ({ phone, password }: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authService.login({ phone, password });
      const accessToken = (res as any)?.access_token;
      if (!accessToken) throw new Error('access_token not found');
      sessionStorage.setItem(STORAGE_KEY, accessToken);
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authenticated: !loading && !!user,
      unauthenticated: !loading && !user,
      refresh,
      signIn,
      signOut,
    }),
    [user, loading, refresh, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

