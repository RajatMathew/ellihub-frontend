import { Card, CardContent } from '@/app/components/ui/card';
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
      <QueryErrorState title="Failed to load monthly bills" onRetry={onRetry} />
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
    <div className="space-y-5">
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
    <Card className="overflow-hidden">
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <ClipboardList className="size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">No monthly bills</p>
          <p className="text-xs text-muted-foreground">
            Unpaid purchase orders for this period will appear here once available.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
