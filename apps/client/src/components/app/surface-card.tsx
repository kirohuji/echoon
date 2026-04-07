import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = '' }: Props) {
  return <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>{children}</section>;
}

