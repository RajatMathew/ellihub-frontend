import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { StatsCard } from '@/app/components/ui/stats-card';
import { formatCurrency } from '@/app/lib/helpers';
import { DollarSign, Package } from 'lucide-react';

interface VendorStatsCardsProps {
  totalVendors: number;
  totalCommitted: number;
  totalPaid: number;
  outstandingBalance: number;
  isLoading: boolean;
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
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-7.5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={`vendor-stat-loader-${index}`}>
            <CardContent className="flex items-center gap-4 py-4">
              <Skeleton className="size-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsItems = [
    {
      label: 'Total Vendors',
      value: totalVendors,
      description: 'All registered vendors',
      icon: <Package className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Committed',
      value: formatCurrency(totalCommitted),
      description: 'Open purchase orders',
      icon: <DollarSign className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
    {
      label: 'Paid to Date',
      value: formatCurrency(totalPaid),
      description: 'Paid invoices',
      icon: <DollarSign className="size-6 text-info" />,
      bgClass: 'bg-info/10',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(outstandingBalance),
      description: 'Unpaid invoices',
      icon: <DollarSign className="size-6 text-warning" />,
      bgClass: 'bg-warning/10',
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-7.5 lg:grid-cols-4">
      {statsItems.map((item) => (
        <StatsCard
          key={item.label}
          icon={item.icon}
          bgClass={item.bgClass}
          label={item.label}
          value={item.value}
          description={item.description}
        />
      ))}
    </div>
  );
}
