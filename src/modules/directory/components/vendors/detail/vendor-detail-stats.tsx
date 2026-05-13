import { StatsCard } from '@/app/components/ui/stats-card';
import { formatCurrency } from '@/app/lib/helpers';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { DollarSign } from 'lucide-react';

interface VendorDetailStatsProps {
  vendor: VendorDetail;
}

export function VendorDetailStats({ vendor }: VendorDetailStatsProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      <StatsCard
        icon={<DollarSign className="size-5 text-success" />}
        bgClass="bg-success/10"
        label="Total Committed"
        value={formatCurrency(vendor.totalCommitted)}
        description={`${vendor.purchaseOrderCount} purchase order${
          vendor.purchaseOrderCount === 1 ? '' : 's'
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
        value={formatCurrency(vendor.currentBalance)}
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
