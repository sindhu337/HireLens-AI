import * as React from 'react';
import { cn } from '@/lib/utils';
import { IconChevronDown } from '@tabler/icons-react';

export interface SelectProps extends React.ComponentProps<'select'> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center min-w-0 w-full sm:w-auto">
        <select
          ref={ref}
          data-slot="select"
          className={cn(
            'flex h-10 w-full appearance-none rounded-xl border border-border/70 bg-muted/40 pl-3 pr-8 text-xs sm:text-sm font-medium shadow-xs transition-colors text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
);
Select.displayName = 'Select';
