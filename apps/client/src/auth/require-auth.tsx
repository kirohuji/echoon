import React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from './auth-provider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, authenticated } = useAuth();

  if (loading) return <div className="p-4 text-sm">Loading...</div>;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

