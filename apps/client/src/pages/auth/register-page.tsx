import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SurfaceCard } from '../../components/app/surface-card';
import { Button, FormField, Input } from '../../components/ui';
import { authService } from '../../auth/auth-service';

export function RegisterPage() {
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.register({ phone, username, password });
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SurfaceCard className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">注册账号</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <FormField label="用户名" htmlFor="username">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
          />
        </FormField>
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
          {loading ? '提交中...' : '注册'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        已有账号？<Link to="/login" className="text-indigo-600">去登录</Link>
      </p>
    </SurfaceCard>
  );
}

