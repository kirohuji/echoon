import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '../../lib/utils';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetPortal = Dialog.Portal;

export function SheetOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Overlay>) {
  return (
    <Dialog.Overlay
      className={cn('fixed inset-0 z-50 bg-black/50', className)}
      {...props}
    />
  );
}

type SheetContentProps = React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
  side?: 'top' | 'bottom' | 'left' | 'right';
};

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className, children, ...props }, ref) => {
    const sideClasses =
      side === 'bottom'
        ? 'inset-x-0 bottom-0 top-auto'
        : side === 'top'
          ? 'inset-x-0 top-0 bottom-auto'
          : side === 'left'
            ? 'inset-y-0 left-0 right-auto'
            : 'inset-y-0 right-0 left-auto';

    return (
      <Dialog.Content
        ref={ref}
        className={cn(
          'fixed z-50 gap-4 bg-white p-0 shadow-lg outline-none',
          sideClasses,
          side === 'bottom' && 'mt-24 rounded-t-[16px]',
          side === 'top' && 'mb-24 rounded-b-[16px]',
          side === 'left' && 'h-full w-3/4 rounded-r-[16px]',
          side === 'right' && 'h-full w-3/4 rounded-l-[16px]',
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    );
  },
);
SheetContent.displayName = 'SheetContent';

