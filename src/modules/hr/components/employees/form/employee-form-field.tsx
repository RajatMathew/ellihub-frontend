import { FieldLabel } from '@/app/components/ui/field';
import { cn } from '@/app/lib/utils';

export const employeeInvalidControlClassName =
  'border-destructive/60 ring-[3px] ring-destructive/10 dark:border-destructive dark:ring-destructive/20';

interface EmployeeFormFieldLabelProps {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function EmployeeFormFieldLabel({
  children,
  required = false,
  className,
}: EmployeeFormFieldLabelProps) {
  return (
    <FieldLabel className={cn('text-xs font-semibold uppercase tracking-normal', className)}>
      <span>{children}</span>
      {required && (
        <span aria-hidden="true" className="-ms-1 text-xs font-semibold text-destructive">
          *
        </span>
      )}
    </FieldLabel>
  );
}
