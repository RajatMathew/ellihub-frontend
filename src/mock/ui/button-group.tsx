import type { ComponentProps } from 'react';

import { cn } from '@/app/lib/utils';

export function ButtonGroup({ className, orientation: _orientation, ...props }: ComponentProps<'div'> & { orientation?: string }) {
  return <div className={cn('flex items-center gap-1', className)} {...props} />;
}

export function ButtonGroupText({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('px-2 text-xs text-muted-foreground', className)} {...props} />;
}
