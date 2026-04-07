import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'primary' | 'neutral' | 'soft';
};

export function AppButton({ children, tone = 'neutral', className = '', ...rest }: Props) {
  const toneClass =
    tone === 'primary'
      ? 'bg-slate-900 text-white border-slate-900'
      : tone === 'soft'
        ? 'bg-slate-100 text-slate-700 border-slate-200'
        : 'bg-white text-slate-700 border-slate-300';
  return (
    <button
      type={rest.type ?? 'button'}
      className={`rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-slate-50 disabled:opacity-60 ${toneClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

