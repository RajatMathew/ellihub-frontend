import type { ComponentProps } from 'react';

import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';

export function InputGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="input-group" className={cn('flex flex-col', className)} {...props} />;
}

export function InputGroupAddon({ className, ...props }: ComponentProps<'div'> & { align?: string }) {
  return <div data-slot="input-addon" className={cn('flex items-center gap-1', className)} {...props} />;
}

export function InputGroupTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  return <Textarea data-slot="input" className={cn('min-h-20 border-0 shadow-none focus-visible:ring-0', className)} {...props} />;
}

type InputGroupButtonProps = ComponentProps<'button'> & { variant?: string; size?: string };

export function InputGroupButton({ className, size = 'icon', variant = 'ghost', ...props }: InputGroupButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60',
        variant === 'primary' || variant === 'default'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        size === 'lg' ? 'size-10 px-4' : size === 'sm' ? 'size-7 px-2' : 'size-8.5',
        className
      )}
      {...props}
    />
  );
}
