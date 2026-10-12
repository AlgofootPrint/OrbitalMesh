import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

export function Switch({ className, ...props }: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn('relative h-6 w-11 border border-border bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal data-[state=checked]:border-signal/50 data-[state=checked]:bg-signal/25', className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 bg-muted-foreground transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-signalSoft" />
    </SwitchPrimitive.Root>
  );
}
