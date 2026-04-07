import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from './auth-service';
import { STORAGE_KEY } from './constant';
import { isValidToken } from './utils';
import { useAppStore } from '../store/app-store';

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
  const setGlobalUser = useAppStore((s) => s.setUser);
  const startPolling = useAppStore((s) => s.startPolling);
  const stopPolling = useAppStore((s) => s.stopPolling);
  const unwrap = (payload: any) => (payload && payload.success === true && 'data' in payload ? payload.data : payload);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = sessionStorage.getItem(STORAGE_KEY);
      if (accessToken && isValidToken(accessToken)) {
        const raw = await authService.profile();
        const res = unwrap(raw);
        const { user: u, profile } = res as any;
        const merged = { ...(u ?? {}), ...(profile ?? {}), accessToken };
        setUser(merged);
        setGlobalUser(merged);
        startPolling();
      } else {
        setUser(null);
        setGlobalUser(null);
        stopPolling();
      }
    } catch (e) {
      console.error('auth refresh failed', e);
      setUser(null);
      setGlobalUser(null);
      stopPolling();
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async ({ phone, password }: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const raw = await authService.login({ phone, password });
      const res = unwrap(raw);
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
    setGlobalUser(null);
    stopPolling();
  }, [setGlobalUser, stopPolling]);

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

