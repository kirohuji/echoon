import { useEffect, useState } from 'react';
import { Button } from '../../components/ui';
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
        <Button
          key={p.key}
          disabled={!enabled[p.key]}
          variant="neutral"
          className="w-full justify-start"
        >
          使用 {p.label} 登录{enabled[p.key] ? '' : '（即将支持）'}
        </Button>
      ))}
    </div>
  );
}

