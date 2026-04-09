import type { ReactNode } from 'react';
import { cn } from '@app/lib/utils';

interface StatsBarProps {
  children: ReactNode;
  className?: string;
  columns?: number;
}

export function StatsBar({ children, className, columns = 4 }: StatsBarProps) {
  // Map columns to grid-cols classes
  const columnClasses: Record<number, string> = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
  };

  const columnClass = columnClasses[columns] || 'md:grid-cols-4';

  return (
    <div
      className={cn(
        'w-full bg-card text-foreground grid grid-cols-1 border border-separator overflow-hidden rounded-xl shadow-xs',
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
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatsBarItem({
  label,
  value,
  description,
  dotColor = 'bg-muted-foreground',
  valueColor = 'text-foreground',
  active,
  onClick,
  className,
}: StatsBarItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-transparent flex flex-col gap-y-1 px-4 py-2.5 border-r border-separator last:border-r-0',
        onClick && 'cursor-pointer transition-colors hover:bg-muted/30',
        active && 'bg-muted/50 select-none',
        className
      )}
    >
      <div className="flex items-center gap-x-1.5">
        <div className={cn('size-1.5 rounded-full', dotColor)} />
        <span className="text-label-light font-semibold text-[12px] tracking-[0.3px] uppercase">
          {label}
        </span>
      </div>
      <div className={cn('leading-[1.55556] font-semibold text-[18px]', valueColor)}>
        {value}
      </div>
      {description && (
        <span className="text-label-lighter font-medium text-[13px]">{description}</span>
      )}
    </div>
  );
}
