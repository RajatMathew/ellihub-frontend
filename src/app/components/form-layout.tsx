import { cn } from '@app/lib/utils';

export function FormLayout({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('min-w-0 max-w-full space-y-6 pt-6', className)} {...props}>
      {children}
    </div>
  );
}

export function FormContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('min-w-0 max-w-full space-y-6', className)} {...props}>
      {children}
    </div>
  );
}
