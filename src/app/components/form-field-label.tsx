import type { ReactNode } from 'react';

import { FieldInfoTooltip } from '@/app/components/field-info-tooltip';
import { FieldLabel } from '@/app/components/ui/field';
import { cn } from '@/app/lib/utils';

export const formFieldLabelClassName = 'text-xs font-semibold uppercase tracking-normal';

export const formInvalidControlClassName =
  'border-destructive/60 ring-[3px] ring-destructive/10 dark:border-destructive dark:ring-destructive/20';

interface FormFieldLabelProps {
  children: ReactNode;
  required?: boolean;
  info?: ReactNode;
  infoLabel?: string;
  className?: string;
}

export function FormFieldLabel({
  children,
  required = false,
  info,
  infoLabel,
  className,
}: FormFieldLabelProps) {
  return (
    <FieldLabel className={cn(formFieldLabelClassName, className)}>
      <span>{children}</span>
      {info && <FieldInfoTooltip label={infoLabel}>{info}</FieldInfoTooltip>}
      {required && (
        <span aria-hidden="true" className="-ms-1 text-xs font-semibold text-destructive">
          *
        </span>
      )}
    </FieldLabel>
  );
}
