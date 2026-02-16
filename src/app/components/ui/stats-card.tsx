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
      <CardContent className="flex items-center gap-4 py-4">
        <div
          className={`flex items-center justify-center size-12 rounded-lg ${bgClass}`}
        >
          {icon}
        </div>
        <div className="space-y-0.5">
          <div className="text-2xl font-semibold leading-none text-foreground">
            {value}
          </div>
          <div className="text-sm text-muted-foreground">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
