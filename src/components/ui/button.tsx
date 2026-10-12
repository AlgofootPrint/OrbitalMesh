import * as React from 'react';
import { cn } from '../../lib/utils';

export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'icon';
}) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 border text-sm transition-all hover:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'border-signal/40 bg-signal/10 text-signalSoft hover:bg-signal hover:text-background',
        variant === 'outline' && 'border-border bg-transparent text-foreground hover:bg-muted',
        variant === 'ghost' && 'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
        variant === 'destructive' && 'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/16',
        size === 'default' && 'px-3',
        size === 'sm' && 'px-3 text-xs',
        size === 'icon' && 'w-11',
        className,
      )}
      {...props}
    />
  );
}
