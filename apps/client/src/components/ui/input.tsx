import * as React from 'react';

import { cn } from '../../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-md border border-black/20 bg-white px-3 py-1 text-sm outline-none transition-colors placeholder:text-black/40 focus-visible:ring-1 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

