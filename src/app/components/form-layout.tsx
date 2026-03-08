import { cn } from '@app/lib/utils';

export function FormLayout({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex gap-8 pt-8', className)} {...props}>
      {children}
    </div>
  );
}

export function FormContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex-1 space-y-6',
        'max-w-[calc(100vw-0rem)]',
        'lg:max-w-[calc(100vw-var(--sidebar-width)-16rem)]',
        'in-data-[sidebar-open=false]:lg:max-w-[calc(100vw-var(--sidebar-collapsed-width)-16rem)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
