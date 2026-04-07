import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '../../components/app/app-button';
import { SurfaceCard } from '../../components/app/surface-card';
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
      <h1 className="text-xl font-semibold text-slate-900">注册账号</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
        <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号" />
        <input type="password" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <AppButton type="submit" disabled={loading} tone="primary" className="w-full justify-center">
          {loading ? '提交中...' : '注册'}
        </AppButton>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        已有账号？<Link to="/login" className="text-indigo-600">去登录</Link>
      </p>
    </SurfaceCard>
  );
}

