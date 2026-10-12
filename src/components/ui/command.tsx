import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '../../lib/utils';

export const Command = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive>) => (
  <CommandPrimitive className={cn('border border-border bg-popover text-popover-foreground', className)} {...props} />
);
export const CommandInput = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) => (
  <CommandPrimitive.Input className={cn('min-h-11 w-full border-b border-border bg-transparent px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal', className)} {...props} />
);
export const CommandList = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>) => (
  <CommandPrimitive.List className={cn('max-h-64 overflow-auto p-1', className)} {...props} />
);
export const CommandItem = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item className={cn('min-h-11 cursor-pointer px-2 py-1.5 text-sm data-[selected=true]:bg-muted', className)} {...props} />
);
export const CommandEmpty = CommandPrimitive.Empty;
