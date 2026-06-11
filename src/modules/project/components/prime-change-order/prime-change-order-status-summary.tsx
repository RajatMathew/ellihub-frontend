import { PRIME_CHANGE_ORDER_STATUSES } from '@/modules/project/schemas/prime-change-order';
import type { PrimeChangeOrderStatusSummaryItem } from '@/modules/project/schemas/prime-change-order';
import {
  formatPrimeChangeOrderCost,
  getPrimeChangeOrderStatusDotClass,
} from '@/modules/project/components/prime-change-order/prime-change-order-list-utils';

interface PrimeChangeOrderStatusSummaryProps {
  statusFilter?: string;
  statusSummary?: PrimeChangeOrderStatusSummaryItem[];
  onStatusChange: (statusName: string | undefined) => void;
}

export function PrimeChangeOrderStatusSummary({
  statusFilter,
  statusSummary,
  onStatusChange,
}: PrimeChangeOrderStatusSummaryProps) {
  const statusSummaryByName = new Map((statusSummary ?? []).map((item) => [item.statusName, item]));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
      {PRIME_CHANGE_ORDER_STATUSES.map((statusName) => {
        const item = statusSummaryByName.get(statusName);
        const isActive = statusFilter === statusName;
        const totalCost = item?.totalCost ?? 0;

        return (
          <button
            key={statusName}
            type="button"
            className={`rounded-md border bg-card p-3 text-left transition-colors hover:border-primary/40 ${
              isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : ''
            }`}
            onClick={() => onStatusChange(isActive ? undefined : statusName)}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              <span
                className={`size-2 rounded-full ${getPrimeChangeOrderStatusDotClass(statusName)}`}
              />
              <span className="truncate">{statusName}</span>
            </div>
            <div
              className={`mt-2 text-base font-semibold tabular-nums ${
                totalCost < 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {formatPrimeChangeOrderCost(totalCost)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item?.count ?? 0} item{(item?.count ?? 0) === 1 ? '' : 's'}
            </div>
          </button>
        );
      })}
    </div>
  );
}
