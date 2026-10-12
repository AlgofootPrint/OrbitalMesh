import * as React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
