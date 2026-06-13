import { ListStatsCards, type ListStatCardItem } from '@/app/components/ui/list-stats-cards';
import {
  formatPrimeChangeOrderCost,
  getPrimeChangeOrderStatusDotClass,
} from '@/modules/project/components/prime-change-order/prime-change-order-list-utils';
import { PRIME_CHANGE_ORDER_STATUSES } from '@/modules/project/schemas/prime-change-order';
import type { PrimeChangeOrderStatusSummaryItem } from '@/modules/project/schemas/prime-change-order';

interface PrimeChangeOrderStatusSummaryProps {
  statusFilter?: string;
  statusSummary?: PrimeChangeOrderStatusSummaryItem[];
  isLoading?: boolean;
  onStatusChange: (statusName: string | undefined) => void;
}

export function PrimeChangeOrderStatusSummary({
  statusFilter,
  statusSummary,
  isLoading,
  onStatusChange,
}: PrimeChangeOrderStatusSummaryProps) {
  const statusSummaryByName = new Map((statusSummary ?? []).map((item) => [item.statusName, item]));
  const items: ListStatCardItem[] = PRIME_CHANGE_ORDER_STATUSES.map((statusName) => {
    const item = statusSummaryByName.get(statusName);
    const isActive = statusFilter === statusName;
    const totalCost = item?.totalCost ?? 0;

    return {
      label: statusName,
      value: formatPrimeChangeOrderCost(totalCost),
      description: `${item?.count ?? 0} item${(item?.count ?? 0) === 1 ? '' : 's'}`,
      dotColor: getPrimeChangeOrderStatusDotClass(statusName),
      valueColor: totalCost < 0 ? 'text-destructive' : 'text-foreground',
      active: isActive,
      onClick: () => onStatusChange(isActive ? undefined : statusName),
    };
  });

  return (
    <ListStatsCards
      items={items}
      isLoading={isLoading}
      skeletonCount={7}
      columns={{ sm: 2, lg: 4, '2xl': 7 }}
      className="mb-5 lg:mb-7.5"
    />
  );
}
