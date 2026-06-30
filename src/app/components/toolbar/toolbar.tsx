import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

export const Toolbar = forwardRef<
  HTMLDivElement,
  {
    children?: ReactNode;
    sticky?: boolean;
    className?: string;
  }
>(({ children, sticky = true, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 grow flex-col gap-5 overflow-x-clip -mx-4 w-[calc(100%+2rem)] px-4 lg:-mx-7.5 lg:w-[calc(100%+3.75rem)] lg:px-7.5 -mt-7.5 pt-7.5 pb-6 mb-6 bg-page-header border-page-header-border',
        sticky && 'sticky top-0 z-20 border-b',
        className
      )}
    >
      {children}
    </div>
  );
});

function ToolbarActions({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 max-w-full flex-wrap items-center gap-2.5', className)}>
      {children}
    </div>
  );
}

function ToolbarHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 max-w-full flex-1 flex-col flex-wrap gap-2.5 lg:gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}

function ToolbarPageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="min-w-0 max-w-full break-words text-xl font-medium leading-tight text-foreground [overflow-wrap:anywhere]">
      {children}
    </h1>
  );
}

function ToolbarWrapper({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-w-0 max-w-full flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start sm:gap-2.5">
      {children}
    </div>
  );
}

export { ToolbarActions, ToolbarHeading, ToolbarPageTitle, ToolbarWrapper };
