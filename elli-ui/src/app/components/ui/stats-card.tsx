import type { ReactNode } from 'react';

import { cn } from '@app/lib/utils';

import { Card, CardContent } from '@app/components/ui/card';

interface StatsCardProps {
  icon: ReactNode;
  bgClass: string;
  label: string;
  value: number | string;
  description?: string;
  compactValue?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export function StatsCard({
  icon,
  bgClass,
  label,
  value,
  description,
  compactValue = false,
  active,
  onClick,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        'h-full',
        onClick && 'cursor-pointer transition-colors hover:border-success/50',
        active && 'border-success bg-success/10 ring-2 ring-success/40',
      )}
      onClick={onClick}
    >
      <CardContent className="flex h-full min-w-0 items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg sm:size-12 ${bgClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 self-center space-y-1">
          <div
            className={cn(
              'break-normal font-semibold leading-tight text-foreground',
              compactValue ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl',
            )}
            title={String(value)}
          >
            {value}
          </div>
          <div className="break-words text-sm leading-snug text-muted-foreground">{label}</div>
          {description && (
            <div className="break-words text-xs leading-snug text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
