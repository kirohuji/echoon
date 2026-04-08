import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '../ui/button';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'primary' | 'neutral' | 'soft';
};

export function AppButton({ children, tone = 'neutral', className = '', ...rest }: Props) {
  return (
    <Button type={rest.type ?? 'button'} variant={tone} className={className} {...rest}>
      {children}
    </Button>
  );
}

