import { cn } from '@app/lib/utils';

export interface StatItem {
  label: string;
  value: string | number;
  description?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export interface StatsRowProps {
  items: StatItem[];
  className?: string;
}

const dotColors = {
  default: 'bg-gray-800',
  primary: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
};

const valueColors = {
  default: 'text-gray-900 dark:text-white',
  primary: 'text-gray-900 dark:text-white',
  success: 'text-gray-900 dark:text-white',
  warning: 'text-gray-900 dark:text-white',
  danger: 'text-red-600',
};

const descriptionColors = {
  default: 'text-gray-500',
  primary: 'text-gray-500',
  success: 'text-gray-500',
  warning: 'text-gray-500',
  danger: 'text-red-500',
};

export function StatsRow({ items, className }: StatsRowProps) {
  return (
    <div
      className={cn(
        'grid rounded-sm border border-gray-200 bg-card shadow-sm',
        items.length === 4 && 'grid-cols-4',
        items.length === 3 && 'grid-cols-3',
        items.length === 2 && 'grid-cols-2',
        items.length === 1 && 'grid-cols-1',
        className
      )}
    >
      {items.map((item, index) => {
        const variant = item.variant || 'default';
        return (
          <div
            key={index}
            className={cn(
              'space-y-1.5 px-6 py-5',
              index !== items.length - 1 && 'border-r border-gray-200'
            )}
          >
            {/* Label with dot */}
            <div className="flex items-center gap-2">
              <span className={cn('size-1.25 shrink-0 rounded-full', dotColors[variant])} />
              <span className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase">
                {item.label}
              </span>
            </div>

            {/* Value */}
            <div className={cn('text-[28px] leading-none font-bold', valueColors[variant])}>
              {item.value}
            </div>

            {/* Description */}
            {item.description && (
              <div className={cn('text-[13px]', descriptionColors[variant])}>
                {item.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
