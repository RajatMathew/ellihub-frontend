import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { formatCurrency } from '@/app/lib/helpers';
import { getVendorCommitmentSummaries } from '@/modules/directory/components/vendors/vendor-commitment-utils';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';

interface VendorDetailStatsProps {
  vendor: VendorDetail;
}

export function VendorDetailStats({ vendor }: VendorDetailStatsProps) {
  const purchaseOrdersQuery = usePOsQuery({
    vendorId: vendor.id,
    page: 1,
    size: 1000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const commitment = getVendorCommitmentSummaries(purchaseOrdersQuery.data?.data ?? []).get(
    vendor.id
  );
  const totalCommitted = commitment?.totalCommitted ?? vendor.totalCommitted;
  const purchaseOrderCount = commitment?.purchaseOrderCount ?? vendor.purchaseOrderCount;
  const currentBalance = totalCommitted - vendor.totalPaid;
  const statsItems = [
    {
      label: 'Total Committed',
      value: formatCurrency(totalCommitted),
      description: `${purchaseOrderCount} purchase order${purchaseOrderCount === 1 ? '' : 's'}`,
      dotColor: 'bg-success',
    },
    {
      label: 'Paid to Date',
      value: formatCurrency(vendor.totalPaid),
      description: `${vendor.invoiceCount} invoice${vendor.invoiceCount === 1 ? '' : 's'}`,
      dotColor: 'bg-info',
    },
    {
      label: 'Current Balance',
      value: formatCurrency(currentBalance),
      description: 'Committed minus paid',
      dotColor: 'bg-warning',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(vendor.outstandingBalance),
      description: 'Unpaid invoices',
      dotColor: 'bg-primary',
    },
  ];

  return (
    <StatsBar variant="cards" width="full" columns={{ sm: 2, '2xl': 4 }}>
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
