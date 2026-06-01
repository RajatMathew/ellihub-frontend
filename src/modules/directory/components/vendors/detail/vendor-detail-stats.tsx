import { StatsCard } from '@/app/components/ui/stats-card';
import { formatCurrency } from '@/app/lib/helpers';
import { getVendorCommitmentSummaries } from '@/modules/directory/components/vendors/vendor-commitment-utils';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';
import { DollarSign } from 'lucide-react';

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

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      <StatsCard
        icon={<DollarSign className="size-5 text-success" />}
        bgClass="bg-success/10"
        label="Total Committed"
        value={formatCurrency(totalCommitted)}
        description={`${purchaseOrderCount} purchase order${
          purchaseOrderCount === 1 ? '' : 's'
        }`}
      />
      <StatsCard
        icon={<DollarSign className="size-5 text-info" />}
        bgClass="bg-info/10"
        label="Paid to Date"
        value={formatCurrency(vendor.totalPaid)}
        description={`${vendor.invoiceCount} invoice${vendor.invoiceCount === 1 ? '' : 's'}`}
      />
      <StatsCard
        icon={<DollarSign className="size-5 text-warning" />}
        bgClass="bg-warning/10"
        label="Current Balance"
        value={formatCurrency(currentBalance)}
        description="Committed minus paid"
      />
      <StatsCard
        icon={<DollarSign className="size-5 text-primary" />}
        bgClass="bg-primary/10"
        label="Outstanding"
        value={formatCurrency(vendor.outstandingBalance)}
        description="Unpaid invoices"
      />
    </div>
  );
}
