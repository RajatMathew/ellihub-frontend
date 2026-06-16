'use client';

/* eslint-disable react-refresh/only-export-components -- dateInputStyles and types exported for API */
import type { VariantProps } from 'class-variance-authority';
import {
  composeRenderProps,
  DateField as DateFieldRa,
  DateInput as DateInputRa,
  DateSegment as DateSegmentRa,
  TimeField as TimeFieldRa,
} from 'react-aria-components';
import type {
  DateFieldProps,
  DateInputProps as DateInputPropsRa,
  DateSegmentProps,
  DateValue as DateValueRa,
  TimeFieldProps,
  TimeValue as TimeValueRa,
} from 'react-aria-components';

import { inputVariants } from '@app/components/ui/input';
import { cn } from '@app/lib/utils';

function DateField<T extends DateValueRa>({ className, children, ...props }: DateFieldProps<T>) {
  return (
    <DateFieldRa
      className={composeRenderProps(className, (className: string | undefined) => cn(className))}
      data-slot="datefield"
      {...props}
    >
      {children}
    </DateFieldRa>
  );
}

function TimeField<T extends TimeValueRa>({ className, children, ...props }: TimeFieldProps<T>) {
  return (
    <TimeFieldRa
      className={composeRenderProps(className, (className: string | undefined) => cn(className))}
      data-slot="datefield"
      {...props}
    >
      {children}
    </TimeFieldRa>
  );
}

function DateSegment({ segment, className, ...props }: DateSegmentProps) {
  return (
    <DateSegmentRa
      segment={segment}
      className={composeRenderProps(className, (className: string | undefined) =>
        cn(
          `
            text-foreground inline-flex rounded px-0.5 caret-transparent outline-hidden data-[type=literal]:text-muted-foreground/70 data-[type=literal]:px-0
            data-placeholder:text-muted-foreground/70
            data-invalid:data-focused:bg-destructive data-invalid:data-placeholder:text-destructive data-invalid:text-destructive data-invalid:data-focused:data-placeholder:text-destructive-foreground data-invalid:data-focused:text-destructive-foreground 
            data-focused:bg-accent data-focused:data-placeholder:text-foreground data-focused:text-foreground             
            data-disabled:cursor-not-allowed data-disabled:opacity-50
          `,
          className
        )
      )}
      {...props}
      data-invalid
    />
  );
}

const dateInputStyles = `
  relative inline-flex items-center overflow-hidden whitespace-nowrap
  data-focus-within:ring-ring/30 data-focus-within:border-ring data-focus-within:outline-none data-focus-within:ring-[3px] 
  data-focus-within:has-aria-invalid:ring-destructive/20 dark:data-focus-within:has-aria-invalid:ring-destructive/40 data-focus-within:has-aria-invalid:border-destructive
`;

interface DateInputProps extends DateInputPropsRa, VariantProps<typeof inputVariants> {
  className?: string;
  variant?: VariantProps<typeof inputVariants>['variant'];
}

function DateInput({ className, variant = 'md', ...props }: Omit<DateInputProps, 'children'>) {
  return (
    <DateInputRa
      data-slot="input"
      className={composeRenderProps(className, (className: string | undefined) =>
        cn(inputVariants({ variant }), dateInputStyles, className)
      )}
      {...props}
    >
      {(segment: Parameters<NonNullable<DateInputPropsRa['children']>>[0]) => (
        <DateSegment segment={segment} />
      )}
    </DateInputRa>
  );
}

export { DateField, DateInput, DateSegment, TimeField, dateInputStyles };
export type { DateInputProps };
