import { StatsCard } from '@/app/components/ui/stats-card';
import { formatCurrency } from '@/app/lib/helpers';
import { PAYMENT_TERMS_LABELS } from '@/modules/directory/constants/shared.constants';
import type { GCStats, GeneralContractorDetail } from '@/modules/directory/schemas/gc.schema';
import { Briefcase, DollarSign, FolderOpen, ShieldCheck } from 'lucide-react';

interface GCDetailStatsProps {
  gc: GeneralContractorDetail;
  stats: GCStats | undefined;
  contactCount: number;
}

export function GCDetailStats({ gc, stats, contactCount }: GCDetailStatsProps) {
  const resolvedStats = stats ?? { totalGCs: 0, activeProjects: 0, totalCommitted: 0 };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        icon={<DollarSign className="size-5 text-success" />}
        bgClass="bg-success/10"
        label="Total Committed"
        value={formatCurrency(resolvedStats.totalCommitted)}
        description="Portfolio value"
      />
      <StatsCard
        icon={<FolderOpen className="size-5 text-info" />}
        bgClass="bg-info/10"
        label="Total Projects"
        value={gc.projects?.length ?? 0}
        description="Linked projects"
      />
      <StatsCard
        icon={<Briefcase className="size-5 text-warning" />}
        bgClass="bg-warning/10"
        label="Team Contacts"
        value={contactCount}
        description="Linked contacts"
      />
      <StatsCard
        icon={<ShieldCheck className="size-5 text-primary" />}
        bgClass="bg-primary/10"
        label="Retainage"
        value={`${gc.retainagePercent}%`}
        description={
          gc.paymentTerms ? (PAYMENT_TERMS_LABELS[gc.paymentTerms] ?? gc.paymentTerms) : 'No terms'
        }
      />
    </div>
  );
}
