import { forwardRef, type ReactNode } from 'react';

import { cn } from '@app/lib/utils';

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
        'flex flex-col grow gap-5 -mx-4 px-4 lg:-mx-7.5 lg:px-7.5 -mt-7.5 pt-7.5 pb-6 mb-6 bg-background border-border',
        sticky && 'sticky top-0 z-20 border-b',
        className,
      )}
    >
      {children}
    </div>
  );
});

function ToolbarActions({ children }: { children?: ReactNode }) {
  return <div className="flex items-center gap-2.5">{children}</div>;
}

function ToolbarHeading({ children }: { children: ReactNode }) {
  return <div className="flex flex-col flex-wrap gap-2.5 lg:gap-4">{children}</div>;
}

function ToolbarPageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-xl font-medium leading-none text-foreground">{children}</h1>;
}

function ToolbarWrapper({ children }: { children?: ReactNode }) {
  return <div className="flex items-center flex-wrap justify-between gap-2.5">{children}</div>;
}

export { ToolbarActions, ToolbarHeading, ToolbarPageTitle, ToolbarWrapper };
