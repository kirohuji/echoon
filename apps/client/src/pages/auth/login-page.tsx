import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SurfaceCard } from '../../components/app/surface-card';
import { Button, FormField, Input } from '../../components/ui';
import { useAuth } from '../../auth/auth-provider';
import { SocialLoginButtons } from './social-login-buttons';

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
      navigate('/home', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <SurfaceCard className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">登录 Echoon</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">先以账号密码可用，第三方登录按钮已预留。</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <FormField label="手机号" htmlFor="phone">
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" />
        </FormField>
        <FormField label="密码" htmlFor="password">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
          />
        </FormField>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={loading} variant="primary" className="w-full">
          {loading ? '登录中...' : '登录'}
        </Button>
      </form>
      <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />
      <SocialLoginButtons />
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        还没有账号？<Link to="/register" className="text-indigo-600">立即注册</Link>
      </p>
    </SurfaceCard>
  );
}

