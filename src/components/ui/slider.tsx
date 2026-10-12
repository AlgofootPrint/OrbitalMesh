import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../../lib/utils';

export function Slider({ className, ...props }: React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn('relative flex h-11 w-full touch-none select-none items-center', className)} {...props}>
      <SliderPrimitive.Track className="relative h-1 w-full grow bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-signal/80" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 border border-signal bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" />
    </SliderPrimitive.Root>
  );
}
