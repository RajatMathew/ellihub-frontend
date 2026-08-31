/* eslint-disable react-refresh/only-export-components -- variants and types exported for API */

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { Slot as SlotPrimitive } from 'radix-ui';

import { cn } from '@app/lib/utils';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  dotClassName?: string;
  disabled?: boolean;
}

export interface BadgeButtonProps
  extends React.ButtonHTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeButtonVariants> {
  asChild?: boolean;
}

export type BadgeDotProps = React.HTMLAttributes<HTMLSpanElement>;

const badgeVariants = cva(
  // Mono, uppercase and letter-spaced, in a pill. A badge in this app is a
  // *label* — a status, a type — not prose, and setting it apart from the row's
  // own text is what keeps a table scannable.
  //
  // `border` with no colour: `globals.css` applies `border-border` to everything,
  // so this is the theme's own edge. Every badge carries it unless its appearance
  // says otherwise — `ghost` sets `border-transparent` for exactly that reason.
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border font-mono font-semibold uppercase leading-none tracking-wider focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:-ms-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-success-accent text-success-foreground',
        warning: 'bg-warning-accent text-warning-foreground',
        info: 'bg-info-accent text-info-foreground',
        outline: 'bg-transparent border border-border text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      appearance: {
        default: '',
        light: '',
        outline: '',
        ghost: 'border-transparent bg-transparent',
      },
      disabled: {
        true: 'opacity-50 pointer-events-none',
      },
      size: {
        // No `rounded-*` here: the pill radius belongs to the base, and a radius
        // set per size would win over it.
        lg: 'h-7 min-w-7 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5',
        md: 'h-6 min-w-6 gap-1.5 px-2 text-xs [&_svg]:size-3.5',
        sm: 'h-5 min-w-5 gap-1 px-1.5 text-[0.6875rem] [&_svg]:size-3',
        xs: 'h-4 min-w-4 gap-1 px-1 text-[0.625rem] [&_svg]:size-3',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
      },
    },
    compoundVariants: [
      /* Light */
      {
        variant: 'primary',
        appearance: 'light',
        className: 'bg-primary-soft text-primary-soft-foreground',
      },
      {
        variant: 'secondary',
        appearance: 'light',
        className: 'bg-secondary dark:bg-secondary/50 text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'light',
        className: 'bg-success-soft text-success-soft-foreground',
      },
      {
        variant: 'warning',
        appearance: 'light',
        className: 'bg-warning-soft text-warning-soft-foreground',
      },
      {
        variant: 'info',
        appearance: 'light',
        className: 'bg-info-soft text-info-soft-foreground',
      },
      {
        variant: 'destructive',
        appearance: 'light',
        className: 'bg-destructive-soft text-destructive-soft-foreground',
      },
      /* Outline */
      {
        variant: 'primary',
        appearance: 'outline',
        className: 'border-primary-alpha bg-primary-soft text-primary-soft-foreground',
      },
      {
        variant: 'secondary',
        appearance: 'outline',
        className: 'border-border bg-secondary text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'outline',
        className: 'border-success-alpha bg-success-soft text-success-soft-foreground',
      },
      {
        variant: 'warning',
        appearance: 'outline',
        className: 'border-warning-alpha bg-warning-soft text-warning-soft-foreground',
      },
      {
        variant: 'info',
        appearance: 'outline',
        className: 'border-info-alpha bg-info-soft text-info-soft-foreground',
      },
      {
        variant: 'destructive',
        appearance: 'outline',
        className: 'border-destructive-alpha bg-destructive-soft text-destructive-soft-foreground',
      },
      /* Ghost */
      {
        variant: 'primary',
        appearance: 'ghost',
        className: 'text-primary',
      },
      {
        variant: 'secondary',
        appearance: 'ghost',
        className: 'text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'ghost',
        className: 'text-success-accent',
      },
      {
        variant: 'warning',
        appearance: 'ghost',
        className: 'text-warning-accent',
      },
      {
        variant: 'info',
        appearance: 'ghost',
        className: 'text-info-accent',
      },
      {
        variant: 'destructive',
        appearance: 'ghost',
        className: 'text-destructive',
      },

      { size: 'lg', appearance: 'ghost', className: 'px-0' },
      { size: 'md', appearance: 'ghost', className: 'px-0' },
      { size: 'sm', appearance: 'ghost', className: 'px-0' },
      { size: 'xs', appearance: 'ghost', className: 'px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'default',
      size: 'md',
    },
  }
);

const badgeButtonVariants = cva(
  'cursor-pointer transition-all inline-flex items-center justify-center leading-none size-3.5 [&>svg]:opacity-100! [&>svg]:size-3.5! p-0 rounded-md -me-0.5 opacity-60 hover:opacity-100',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant,
  size,
  appearance,
  shape,
  asChild = false,
  disabled,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, appearance, shape, disabled }), className)}
      {...props}
    />
  );
}

function BadgeButton({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof badgeButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'span';
  return (
    <Comp
      data-slot="badge-button"
      className={cn(badgeButtonVariants({ variant, className }))}
      role="button"
      {...props}
    />
  );
}

function BadgeDot({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="badge-dot"
      className={cn('size-1.5 rounded-full bg-[currentColor]', className)}
      {...props}
    />
  );
}

export { Badge, BadgeButton, BadgeDot, badgeVariants };
