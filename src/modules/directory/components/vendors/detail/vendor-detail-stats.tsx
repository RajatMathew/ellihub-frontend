import { StatsCard } from '@/app/components/ui/stats-card';
import { DollarSign, ShieldCheck } from 'lucide-react';

export function VendorDetailStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        icon={<DollarSign className="size-5 text-foreground" />}
        bgClass="bg-muted"
        label="Total Committed"
        value="-"
        description="Coming soon"
      />
      <StatsCard
        icon={<DollarSign className="size-5 text-info" />}
        bgClass="bg-info/10"
        label="Paid to Date"
        value="-"
        description="Coming soon"
      />
      <StatsCard
        icon={<DollarSign className="size-5 text-success" />}
        bgClass="bg-success/10"
        label="Current Balance"
        value="-"
        description="Coming soon"
      />
      <StatsCard
        icon={<ShieldCheck className="size-5 text-destructive" />}
        bgClass="bg-destructive/10"
        label="Compliance Status"
        value="-"
        description="Coming soon"
      />
    </div>
  );
}
