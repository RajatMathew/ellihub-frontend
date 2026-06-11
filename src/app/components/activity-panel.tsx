import type { ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { AlertCircle, History, RefreshCcw } from 'lucide-react';

export interface ActivityPanelItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  icon: ReactNode;
  toneClassName: string;
}

interface ActivityPanelProps {
  items: ActivityPanelItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyMessage?: string;
}

export function ActivityPanel({
  items,
  isLoading,
  isError,
  onRetry,
  emptyMessage = 'No activity recorded yet.',
}: ActivityPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={`activity-loader-${index}`} className="flex gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <AlertCircle className="size-8 text-destructive/70" />
        <p className="text-sm font-medium">Unable to load activity.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <History className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      {items.map((item) => (
        <div key={item.id} className="flex min-w-0 gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full border',
              item.toneClassName
            )}
          >
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <p className="break-words text-sm font-medium text-foreground">{item.user}</p>
              <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                {item.timestamp}
              </span>
            </div>
            <p className="break-words text-sm text-muted-foreground">{item.action}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
