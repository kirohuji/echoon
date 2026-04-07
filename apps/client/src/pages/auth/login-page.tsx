import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">登录 Echoon</h1>
      <p className="mt-1 text-sm text-slate-500">先以账号密码可用，第三方登录按钮已预留。</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="手机号"
        />
        <input
          type="password"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <div className="my-4 h-px bg-slate-200" />
      <SocialLoginButtons />
      <p className="mt-4 text-sm text-slate-600">
        还没有账号？<Link to="/register" className="text-indigo-600">立即注册</Link>
      </p>
    </div>
  );
}

