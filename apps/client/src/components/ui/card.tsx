import * as React from 'react';

import { cn } from '../../lib/utils';

export type CardProps = React.HTMLAttributes<HTMLElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn('rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}
