import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">注册账号</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
        <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号" />
        <input type="password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60">
          {loading ? '提交中...' : '注册'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        已有账号？<Link to="/login" className="text-indigo-600">去登录</Link>
      </p>
    </div>
  );
}

