import type { ReactNode } from 'react';

import { cn } from '@app/lib/utils';

import { Card, CardContent } from '@app/components/ui/card';

interface StatsCardProps {
  icon: ReactNode;
  bgClass: string;
  label: string;
  value: number | string;
  description?: string;
  active?: boolean;
  onClick?: () => void;
}

export function StatsCard({ icon, bgClass, label, value, description, active, onClick }: StatsCardProps) {
  return (
    <Card
      className={cn(
        onClick && 'cursor-pointer transition-colors hover:border-success/50',
        active && 'border-success bg-success/10 ring-2 ring-success/40',
      )}
      onClick={onClick}
    >
      <CardContent className="flex min-w-0 items-center gap-3 py-4 sm:gap-4">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg sm:size-12 ${bgClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="break-words text-xl font-semibold leading-tight text-foreground sm:text-2xl">
            {value}
          </div>
          <div className="break-words text-sm text-muted-foreground">{label}</div>
          {description && (
            <div className="break-words text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
