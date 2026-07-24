import { QueryErrorState } from '@/app/components/query-error-state';
import {
  RegisterTransactionSkeleton,
  RegisterTransactionViews,
} from '@/modules/finance/components/register-transaction-views';
import type { QuickBooksRegisterTransaction } from '@/modules/integrations/schemas/quickbooks.schema';
import { Loader2, SlidersHorizontal } from 'lucide-react';

interface RegisterTransactionsContentProps {
  transactions: QuickBooksRegisterTransaction[];
  currencyCode: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function RegisterTransactionsContent({
  transactions,
  currencyCode,
  isLoading,
  isRefreshing,
  isError,
  onRetry,
}: RegisterTransactionsContentProps) {
  if (isLoading) return <RegisterTransactionSkeleton />;

  if (isError) {
    return (
      <QueryErrorState title="Failed to load transactions" onRetry={onRetry} className="min-h-80" />
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-center">
        <SlidersHorizontal className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No transactions found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Adjust the date range, search, or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      {isRefreshing && (
        <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Loader2 className="size-3.5 animate-spin" />
            Refreshing
          </span>
        </div>
      )}
      <RegisterTransactionViews transactions={transactions} currencyCode={currencyCode} />
    </div>
  );
}
