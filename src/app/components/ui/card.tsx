'use client';

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@app/lib/utils';

// Define CardContext
type CardContextType = {
  variant: 'default' | 'accent' | 'themed' | 'framed';
};

const CardContext = React.createContext<CardContextType>({
  variant: 'default', // Default value
});

// Hook to use CardContext
const useCardContext = () => {
  const context = React.useContext(CardContext);
  if (!context) {
    throw new Error('useCardContext must be used within a Card component');
  }
  return context;
};

// Variants
const cardVariants = cva(
  // `relative` so an overlay inside the card — the table's refresh indicator —
  // has a defined containing block instead of finding whichever ancestor happens
  // to be positioned. No offsets, so it changes nothing on its own.
  'relative flex min-w-0 max-w-full flex-col items-stretch text-card-foreground rounded-xl',
  {
    variants: {
      variant: {
        default: 'bg-card border border-card-border shadow-xs black/5',
        accent: 'bg-muted shadow-xs p-1',
        themed: 'bg-card border border-card-border shadow-xs',
        // `themed` inset in a mat: the card keeps its own surface, and the muted
        // gutter around it separates the table from the page rather than letting
        // the two whites run together.
        //
        // `rounded-2xl` (16px) is not decoration — the outer radius has to exceed
        // the inner one or the corners read as pinched. Inner is `rounded-xl`
        // (12px) plus the 6px gutter, so 18px is exact and 16px is the nearest
        // step on the scale.
        framed: 'bg-muted/50 border border-card-border shadow-xs p-1.5 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'themed',
    },
  }
);

// Headings and links are still reached by descendant selector: they carry no
// palette of their own and there is nothing to hand them a token. Controls are
// NOT — `[data-surface=card-header]` in globals.css remaps --background /
// --foreground / --input-border / --accent for this subtree, so Button, Input
// and Select render correctly here on their own. Restyling them from out here is
// what forced every header control to carry an `!important` string. See
// docs/table-consistency-plan.md.
//
// Shared by `themed` and `framed`, which differ only in what surrounds the card,
// never in how the header paints itself.
const themedCardHeaderClassName =
  'bg-card-header text-card-header-foreground rounded-t-xl [&_h1]:text-card-header-foreground [&_h2]:text-card-header-foreground [&_h3]:text-card-header-foreground [&_h4]:text-card-header-foreground [&_h5]:text-card-header-foreground [&_[data-slot=card-description]]:!text-card-header-foreground/80 [&_a]:text-card-header-foreground [&_a:hover]:text-card-header-foreground [&_a:hover]:underline';

const cardHeaderVariants = cva(
  'flex min-w-0 max-w-full items-center justify-between flex-wrap px-4 py-3 gap-2.5 w-full sm:px-5',
  {
    variants: {
      variant: {
        default: 'border-b border-card-border',
        accent: '',
        themed: themedCardHeaderClassName,
        framed: themedCardHeaderClassName,
      },
    },
    defaultVariants: {
      variant: 'themed',
    },
  }
);

const cardContentVariants = cva('min-w-0 max-w-full grow p-4 sm:p-5', {
  variants: {
    variant: {
      default: '',
      accent: 'bg-card rounded-t-xl [&:last-child]:rounded-b-xl',
      themed: '',
      // The inner panel keeps the card surface; the mat is the Card around it.
      framed: 'bg-card [&:last-child]:rounded-b-xl',
    },
  },
  defaultVariants: {
    variant: 'themed',
  },
});

const cardTableVariants = cva('grid min-w-0 max-w-full grow', {
  variants: {
    variant: {
      default: '',
      accent: 'bg-card rounded-xl',
      themed: '',
      framed: 'bg-card rounded-b-xl',
    },
  },
  defaultVariants: {
    variant: 'themed',
  },
});

const cardFooterVariants = cva('flex min-w-0 max-w-full items-center px-5 min-h-14', {
  variants: {
    variant: {
      default: 'border-t border-card-border',
      accent: 'bg-card rounded-b-xl mt-[2px]',
      themed: 'border-t border-card-border',
      // No surface and no top border: the footer sits on the mat, so the
      // pagination reads as a band under the table rather than as one more row
      // of it. The table above keeps `bg-card`, which is what draws the edge.
      framed: 'rounded-b-xl',
    },
  },
  defaultVariants: {
    variant: 'themed',
  },
});

// Card Component
function Card({
  className,
  variant = 'themed',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return (
    <CardContext.Provider value={{ variant: variant || 'themed' }}>
      <div data-slot="card" className={cn(cardVariants({ variant }), className)} {...props} />
    </CardContext.Provider>
  );
}

// CardHeader Component
function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { variant } = useCardContext();
  return (
    <div
      data-slot="card-header"
      // Stamped wherever the header paints its own background, which is what
      // makes the page palette wrong for the controls inside it. Keyed off that
      // rather than off one variant name, so a variant that reuses the themed
      // header cannot silently lose the remap and send every control back to
      // carrying an `!important` string. See the `[data-surface='card-header']`
      // block in globals.css.
      data-surface={variant === 'themed' || variant === 'framed' ? 'card-header' : undefined}
      className={cn(cardHeaderVariants({ variant }), className)}
      {...props}
    />
  );
}

// CardContent Component
function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { variant } = useCardContext();
  return (
    <div
      data-slot="card-content"
      className={cn(cardContentVariants({ variant }), className)}
      {...props}
    />
  );
}

// CardTable Component
function CardTable({ className, ...props }: React.ComponentProps<'div'>) {
  const { variant } = useCardContext();
  return (
    <div
      data-slot="card-table"
      className={cn(cardTableVariants({ variant }), className)}
      {...props}
    />
  );
}

// CardFooter Component
function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { variant } = useCardContext();
  return (
    <div
      data-slot="card-footer"
      className={cn(cardFooterVariants({ variant }), className)}
      {...props}
    />
  );
}

// Other Components
function CardHeading({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-heading" className={cn('min-w-0 space-y-1', className)} {...props} />;
}

function CardToolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-toolbar"
      className={cn('flex min-w-0 max-w-full flex-wrap items-center gap-2.5', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        'min-w-0 max-w-full break-words text-base font-semibold leading-none tracking-tight [overflow-wrap:anywhere]',
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        'min-w-0 max-w-full break-words text-sm text-muted-foreground [overflow-wrap:anywhere]',
        className
      )}
      {...props}
    />
  );
}

// Exports
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardTitle,
  CardToolbar,
};
