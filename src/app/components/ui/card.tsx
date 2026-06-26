'use client';

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@app/lib/utils';

// Define CardContext
type CardContextType = {
  variant: 'default' | 'accent' | 'themed';
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
  'flex min-w-0 max-w-full flex-col items-stretch text-card-foreground rounded-xl',
  {
    variants: {
      variant: {
        default: 'bg-card border border-card-border shadow-xs black/5',
        accent: 'bg-muted shadow-xs p-1',
        themed: 'bg-card border border-card-border shadow-xs',
      },
    },
    defaultVariants: {
      variant: 'themed',
    },
  }
);

const cardHeaderVariants = cva(
  'flex min-w-0 max-w-full items-center justify-between flex-wrap px-4 py-3 gap-2.5 w-full sm:px-5',
  {
    variants: {
      variant: {
        default: 'border-b border-card-border',
        accent: '',
        themed:
          'bg-card-header text-table-card-header-foreground rounded-t-xl [&_h1]:text-table-card-header-foreground [&_h2]:text-table-card-header-foreground [&_h3]:text-table-card-header-foreground [&_h4]:text-table-card-header-foreground [&_h5]:text-table-card-header-foreground [&>:not([data-slot=card-toolbar]).text-foreground]:text-table-card-header-foreground [&>:not([data-slot=card-toolbar]).text-muted-foreground]:text-table-card-header-foreground/80 [&>:not([data-slot=card-toolbar])_.text-foreground]:text-table-card-header-foreground [&>:not([data-slot=card-toolbar])_.text-muted-foreground]:text-table-card-header-foreground/80 [&_[data-slot=button]:not([role=combobox])]:bg-transparent [&_[data-slot=button]:not([role=combobox])]:text-table-card-header-foreground [&_[data-slot=button]:not([role=combobox]):hover]:bg-table-card-header-foreground/10 [&_[data-slot=button]:not([role=combobox]):hover]:text-table-card-header-foreground [&_[data-slot=button]:not([role=combobox]):hover]:no-underline [&_[data-slot=button]:not([role=combobox]).text-foreground]:text-table-card-header-foreground [&_[data-slot=button]:not([role=combobox]).text-muted-foreground]:text-table-card-header-foreground/80 [&_[data-slot=button]:not([role=combobox]):hover.text-muted-foreground]:text-table-card-header-foreground [&_[data-slot=button]:not([role=combobox]).border-foreground]:border-table-card-header-foreground [&_[data-slot=button]:not([role=combobox]).border-transparent]:border-transparent [&_[data-slot=button]:not([role=combobox])]:border-table-card-header-foreground/30 [&_[data-slot=button]:not([role=combobox])_svg]:text-table-card-header-foreground [&_a]:text-table-card-header-foreground [&_a:hover]:text-table-card-header-foreground [&_a:hover]:underline [&_a_svg]:text-table-card-header-foreground',
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
function CardTable({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
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
