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
  acceptingId: string | null;
  onRetry: () => void;
  onRecheck: (conflictId: string) => void;
  onAccept: (conflictId: string) => void;
}

export function PaymentConflictsList({
  conflicts,
  status,
  isLoading,
  isError,
  canResolve,
  recheckingId,
  acceptingId,
  onRetry,
  onRecheck,
  onAccept,
}: PaymentConflictsListProps) {
  if (isLoading) return <PaymentConflictsSkeleton />;

  if (isError) {
    return (
      <Card>
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
      <Card>
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
          isRechecking={recheckingId === conflict.id}
          isAccepting={acceptingId === conflict.id}
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
        <Card key={item} className="overflow-hidden">
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="space-y-3 px-5 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}
