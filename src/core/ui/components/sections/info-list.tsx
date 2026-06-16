import { type ReactNode } from 'react';

import { cn } from '@app/lib/utils';

export interface InfoListItem {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  bold?: boolean;
}

export interface InfoListProps {
  items: InfoListItem[];
  className?: string;
}

export function InfoList({ items, className }: InfoListProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div
            key={index}
            className={cn(
              'flex items-center justify-between py-4',
              !isLast && 'border-b border-gray-100'
            )}
          >
            <span
              className={cn(
                'text-[13px] tracking-wide text-gray-500 uppercase',
                item.bold ? 'font-bold text-gray-900 dark:text-white' : 'font-medium'
              )}
            >
              {item.label}
            </span>
            <span
              className={cn(
                'text-[15px] font-bold',
                item.valueClassName || 'text-gray-900 dark:text-white'
              )}
            >
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
