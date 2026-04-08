import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, hint, className, children }: FormFieldProps) {
  return (
    <label className={cn('block space-y-1.5', className)} htmlFor={htmlFor}>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
    </label>
  );
}
