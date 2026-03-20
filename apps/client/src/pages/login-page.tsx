import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/auth-provider';

export function LoginPage() {
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signIn({ phone, password });
      navigate(`/reading/1`, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    }
  };

  return (
    <div className="p-4">
      <h1 className="mb-2 text-lg font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-2">
        <label className="text-sm">
          Phone
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="your phone"
          />
        </label>
        <label className="text-sm">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded border px-2 py-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="your password"
          />
        </label>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <button className="mt-2 rounded bg-black px-3 py-2 text-white" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-3 text-xs text-gray-500">
        If Tailwind classes do not render yet, we will migrate to Tailwind in the next steps.
      </p>
    </div>
  );
}

