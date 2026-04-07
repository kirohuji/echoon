import { useEffect, useState } from 'react';
import { authService } from '../../auth/auth-service';

const providers = [
  { key: 'google', label: 'Google' },
  { key: 'apple', label: 'Apple' },
  { key: 'wechat', label: '微信' },
  { key: 'x', label: 'X' },
  { key: 'phoneSms', label: '手机号验证码' },
] as const;

export function SocialLoginButtons() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void authService.providers().then(setEnabled).catch(() => setEnabled({}));
  }, []);

  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <button
          key={p.key}
          type="button"
          disabled={!enabled[p.key]}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          使用 {p.label} 登录{enabled[p.key] ? '' : '（即将支持）'}
        </button>
      ))}
    </div>
  );
}

