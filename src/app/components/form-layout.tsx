import { cn } from '@app/lib/utils';

export function FormLayout({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('pt-6 space-y-6', className)} {...props}>
      {children}
    </div>
  );
}

export function FormContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {children}
    </div>
  );
}
