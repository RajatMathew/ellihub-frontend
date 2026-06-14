import { QueryErrorState } from '@/app/components/query-error-state';
import { MonthlyBillsProjectCard } from '@/modules/monthly-bills/components/monthly-bills-project-card';
import { MonthlyBillsTableSkeleton } from '@/modules/monthly-bills/components/monthly-bills-table-skeleton';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { getProjectCardKey } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import type { MonthlyBillProjectGroup } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { ClipboardList } from 'lucide-react';

interface MonthlyBillsTableProps {
  groups: MonthlyBillProjectGroup[];
  selectedDate: Date;
  /** Whether the current user (admin or accountant) can mark payments. */
  canMarkPayment: boolean;
  /** When false, the To Pay / Ready inputs are read-only. */
  editMode: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function MonthlyBillsTable({
  groups,
  selectedDate,
  canMarkPayment,
  editMode,
  visibleColumns,
  isLoading,
  isError,
  onRetry,
}: MonthlyBillsTableProps) {
  if (isError) {
    return (
      <div className="border-t p-4 sm:p-5">
        <QueryErrorState title="Failed to load monthly bills" onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <MonthlyBillsTableSkeleton
        selectedDate={selectedDate}
        canMarkPayment={canMarkPayment}
        visibleColumns={visibleColumns}
      />
    );
  }

  if (groups.length === 0) {
    return <MonthlyBillsEmptyState />;
  }

  return (
    <div>
      {groups.map((group) => (
        <MonthlyBillsProjectCard
          key={getProjectCardKey(group, selectedDate)}
          group={group}
          selectedDate={selectedDate}
          canMarkPayment={canMarkPayment}
          editMode={editMode}
          visibleColumns={visibleColumns}
        />
      ))}
    </div>
  );
}

function MonthlyBillsEmptyState() {
  return (
    <div className="border-t px-4 py-12 sm:px-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-11 items-center justify-center rounded-md bg-muted">
          <ClipboardList className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No monthly bills</p>
          <p className="text-xs text-muted-foreground">
            Unpaid purchase orders for this period will appear here once available.
          </p>
        </div>
      </div>
    </div>
  );
}
