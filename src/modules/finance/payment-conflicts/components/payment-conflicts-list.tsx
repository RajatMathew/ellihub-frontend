import { QueryErrorState } from '@/app/components/query-error-state';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { PaymentConflictCard } from '@/modules/finance/payment-conflicts/components/payment-conflict-card';
import type {
  PaymentConflict,
  PaymentConflictStatus,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { CheckCircle2, History } from 'lucide-react';

interface PaymentConflictsListProps {
  conflicts: PaymentConflict[];
  status: PaymentConflictStatus;
  isLoading: boolean;
  isError: boolean;
  canResolve: boolean;
  recheckingId: string | null;
  acceptingConflictId: string | null;
  acceptingItemIds: string[];
  onRetry: () => void;
  onRecheck: (conflictId: string) => void;
  onAccept: (conflictId: string, items: Array<{ id: string; version: number }>) => void;
}

export function PaymentConflictsList({
  conflicts,
  status,
  isLoading,
  isError,
  canResolve,
  recheckingId,
  acceptingConflictId,
  acceptingItemIds,
  onRetry,
  onRecheck,
  onAccept,
}: PaymentConflictsListProps) {
  if (isLoading) return <PaymentConflictsSkeleton />;

  if (isError) {
    return (
      <Card className="rounded-xl shadow-none">
        <QueryErrorState
          title="Failed to load payment conflicts"
          description="Elli could not load the QuickBooks reconciliation queue."
          onRetry={onRetry}
          className="min-h-72"
        />
      </Card>
    );
  }

  if (conflicts.length === 0) {
    const isActive = status === 'ACTIVE';
    const Icon = isActive ? CheckCircle2 : History;
    return (
      <Card className="rounded-xl shadow-none">
        <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Icon className="size-6 text-muted-foreground" />
          </span>
          <h2 className="text-base font-semibold text-foreground">
            {isActive ? 'No active payment conflicts' : 'No resolved conflicts found'}
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {isActive
              ? 'Tracked Elli payments currently match their QuickBooks transactions.'
              : 'Resolved conflicts will appear here with their resolution history.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => (
        <PaymentConflictCard
          key={conflict.id}
          conflict={conflict}
          canResolve={canResolve}
          itemStatus={status}
          isRechecking={recheckingId === conflict.id}
          acceptingItemIds={acceptingConflictId === conflict.id ? acceptingItemIds : []}
          onRecheck={onRecheck}
          onAccept={onAccept}
        />
      ))}
    </div>
  );
}

function PaymentConflictsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading payment conflicts">
      {[0, 1, 2].map((item) => (
        <Card key={item} className="overflow-hidden rounded-xl shadow-none">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="h-7 w-36" />
          </div>
          <div className="space-y-2 border-t border-border p-3">
            <Skeleton className="h-44 w-full rounded-lg" />
            <Skeleton className="h-44 w-full rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}
