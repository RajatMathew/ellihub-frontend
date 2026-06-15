import { Children, type ReactNode } from 'react';

import { cn } from '@app/lib/utils';

type StatsBarColumnCount = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type StatsBarColumns =
  | StatsBarColumnCount
  | Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', StatsBarColumnCount>>;

const isStatsBarColumnCount = (value: number): value is StatsBarColumnCount =>
  value >= 1 && value <= 7;

interface StatsBarProps {
  children: ReactNode;
  className?: string;
  columns?: StatsBarColumns;
  variant?: 'default' | 'cards';
  width?: 'full' | 'fit';
}

export function StatsBar({
  children,
  className,
  columns,
  variant = 'default',
  width,
}: StatsBarProps) {
  const columnClasses: Record<
    'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl',
    Record<StatsBarColumnCount, string>
  > = {
    base: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      7: 'grid-cols-7',
    },
    sm: {
      1: 'sm:grid-cols-1',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-4',
      5: 'sm:grid-cols-5',
      6: 'sm:grid-cols-6',
      7: 'sm:grid-cols-7',
    },
    md: {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
      5: 'md:grid-cols-5',
      6: 'md:grid-cols-6',
      7: 'md:grid-cols-7',
    },
    lg: {
      1: 'lg:grid-cols-1',
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
      7: 'lg:grid-cols-7',
    },
    xl: {
      1: 'xl:grid-cols-1',
      2: 'xl:grid-cols-2',
      3: 'xl:grid-cols-3',
      4: 'xl:grid-cols-4',
      5: 'xl:grid-cols-5',
      6: 'xl:grid-cols-6',
      7: 'xl:grid-cols-7',
    },
    '2xl': {
      1: '2xl:grid-cols-1',
      2: '2xl:grid-cols-2',
      3: '2xl:grid-cols-3',
      4: '2xl:grid-cols-4',
      5: '2xl:grid-cols-5',
      6: '2xl:grid-cols-6',
      7: '2xl:grid-cols-7',
    },
  };

  const childCount = Children.count(children);
  const resolvedColumns = columns ?? (variant === 'cards' ? childCount : 4);
  const getColumnClass = (
    breakpoint: keyof typeof columnClasses,
    count: number | undefined
  ): string | undefined =>
    count && isStatsBarColumnCount(count) ? columnClasses[breakpoint][count] : undefined;
  const columnClass =
    typeof resolvedColumns === 'number'
      ? getColumnClass('md', resolvedColumns) || 'md:grid-cols-4'
      : Object.entries(resolvedColumns).map(([breakpoint, count]) => {
          const key = breakpoint as keyof typeof columnClasses;
          return getColumnClass(key, count);
        });
  const resolvedWidth = width ?? (variant === 'cards' ? 'fit' : 'full');

  return (
    <div
      className={cn(
        'text-foreground grid grid-cols-1',
        resolvedWidth === 'full' && 'w-full',
        resolvedWidth === 'fit' && 'w-fit max-w-full',
        variant === 'default' &&
          'bg-card border border-separator overflow-hidden rounded-xl shadow-xs',
        variant === 'cards' && 'gap-1.5 rounded-2xl border border-border bg-muted/50 p-1.5',
        columnClass,
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatsBarItemProps {
  label: string;
  value: string | number;
  description?: string;
  dotColor?: string;
  valueColor?: string;
  valueSize?: 'medium' | 'big';
  active?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'card';
}

export function StatsBarItem({
  label,
  value,
  description,
  dotColor = 'bg-muted-foreground',
  valueColor = 'text-foreground',
  valueSize = 'medium',
  active,
  onClick,
  className,
  variant = 'default',
}: StatsBarItemProps) {
  const shouldReserveDescription = variant === 'card';
  const valueSizeClassName =
    valueSize === 'big' ? 'text-[28px] leading-none' : 'text-[18px] leading-[1.55556]';
  const classNameValue = cn(
    'flex flex-col gap-y-1',
    variant === 'default' && 'bg-transparent px-4 py-2.5 border-r border-separator last:border-r-0',
    variant === 'card' &&
      'min-h-[104px] justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-xs shadow-black/5',
    onClick && 'cursor-pointer text-left transition-colors hover:bg-muted/30',
    active && variant === 'card' && 'border-primary bg-primary/5 ring-1 ring-primary/25',
    active && variant !== 'card' && 'bg-muted/50 select-none',
    className
  );

  const content = (
    <>
      <div className="flex items-center gap-x-1.5">
        <div className={cn('size-1.5 rounded-full', dotColor)} />
        <span className="text-label-light font-semibold text-[12px] tracking-[0.3px] uppercase">
          {label}
        </span>
      </div>
      <div className={cn('font-semibold', valueSizeClassName, valueColor)}>{value}</div>
      {(description || shouldReserveDescription) && (
        <span
          className={cn(
            'text-label-lighter font-medium text-[13px]',
            !description && shouldReserveDescription && 'invisible'
          )}
        >
          {description || 'Description'}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classNameValue}>
        {content}
      </button>
    );
  }

  return <div className={classNameValue}>{content}</div>;
}
