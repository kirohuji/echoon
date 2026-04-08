import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-sm px-3 text-xs font-medium text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100',
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
