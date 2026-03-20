'use client';

import { useState } from 'react';

import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { useAuthContext } from 'src/auth/hooks';
import { signInWithPassword } from 'src/auth/context/jwt';
import { useRouter } from 'src/routes/hooks';

export function JwtSignInView() {
  const router = useRouter();
  const { checkUserSession } = useAuthContext();

  const [phone, setPhone] = useState('13052202624');
  const [password, setPassword] = useState('123456');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await signInWithPassword({ phone, password });
      await checkUserSession?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const phoneId = 'phone';
  const passwordId = 'password';

  return (
    <div className="mx-auto w-full max-w-sm">
      <h2 className="mb-4 text-xl font-semibold">Sign in</h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 text-sm">
          <div>Phone</div>
          <Input
            id={phoneId}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <div>Password</div>
          <Input
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {errorMsg ? <div className="text-sm text-red-600">{errorMsg}</div> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-4 text-xs text-gray-500">
        Demo: <span className="font-medium">13052202624</span> /{' '}
        <span className="font-medium">123456</span>
      </div>
    </div>
  );
}

