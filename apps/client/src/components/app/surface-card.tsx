import type { ReactNode } from 'react';
import { Card } from '../ui/card';

type Props = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = '' }: Props) {
  return <Card className={className}>{children}</Card>;
}

