import { AlertCircle, RefreshCcw } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';

interface QueryErrorStateProps {
  title: string;
  description?: string;
  onRetry: () => void;
  className?: string;
}

export function QueryErrorState({
  title,
  description = 'Something went wrong. Please try again.',
  onRetry,
  className,
}: QueryErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center',
        className,
      )}
    >
      <AlertCircle className="mb-3 size-10 text-destructive/70" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
        <RefreshCcw className="size-3.5" />
        Retry
      </Button>
    </div>
  );
}
