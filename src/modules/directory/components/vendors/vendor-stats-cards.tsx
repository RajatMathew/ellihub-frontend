import { Skeleton } from '@/app/components/ui/skeleton';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { formatCurrency } from '@/app/lib/helpers';

interface VendorStatsCardsProps {
  totalVendors: number;
  totalCommitted: number;
  totalPaid: number;
  outstandingBalance: number;
  isLoading: boolean;
}

function VendorStatsSkeletonItem() {
  return (
    <div className="flex min-h-[104px] flex-col justify-between gap-y-2 rounded-xl border border-border bg-card px-4 py-3 shadow-xs shadow-black/5">
      <div className="flex items-center gap-x-1.5">
        <Skeleton className="size-1.5 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function VendorStatsCards({
  totalVendors,
  totalCommitted,
  totalPaid,
  outstandingBalance,
  isLoading,
}: VendorStatsCardsProps) {
  if (isLoading) {
    return (
      <StatsBar variant="cards" width="full" columns={{ sm: 2, lg: 4 }} className="mb-5 lg:mb-7.5">
        {Array.from({ length: 4 }, (_, index) => (
          <VendorStatsSkeletonItem key={`vendor-stat-loader-${index}`} />
        ))}
      </StatsBar>
    );
  }

  const statsItems = [
    {
      label: 'Total Vendors',
      value: totalVendors,
      description: 'All registered vendors',
      dotColor: 'bg-primary',
    },
    {
      label: 'Committed',
      value: formatCurrency(totalCommitted),
      description: 'Open purchase orders',
      dotColor: 'bg-success',
    },
    {
      label: 'Paid to Date',
      value: formatCurrency(totalPaid),
      description: 'Paid invoices',
      dotColor: 'bg-info',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(outstandingBalance),
      description: 'Unpaid invoices',
      dotColor: 'bg-warning',
    },
  ];

  return (
    <StatsBar variant="cards" width="full" columns={{ sm: 2, lg: 4 }} className="mb-5 lg:mb-7.5">
      {statsItems.map((item) => (
        <StatsBarItem
          key={item.label}
          variant="card"
          label={item.label}
          value={item.value}
          description={item.description}
          dotColor={item.dotColor}
          valueColor="text-foreground"
          valueSize="medium"
        />
      ))}
    </StatsBar>
  );
}
