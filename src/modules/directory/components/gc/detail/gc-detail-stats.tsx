import { StatsCard } from '@/app/components/ui/stats-card';
import { formatCurrency } from '@/app/lib/helpers';
import { PAYMENT_TERMS_LABELS } from '@/modules/directory/constants/shared.constants';
import type { GeneralContractorDetail } from '@/modules/directory/schemas/gc.schema';
import { Briefcase, DollarSign, FolderOpen, ShieldCheck } from 'lucide-react';

interface GCDetailStatsProps {
  gc: GeneralContractorDetail;
  contactCount: number;
}

export function GCDetailStats({ gc, contactCount }: GCDetailStatsProps) {
  const activeProjectsFromList = gc.projects.filter(
    (project) => project.status.toUpperCase() === 'ACTIVE'
  ).length;
  const activeProjects = gc.activeProjects || activeProjectsFromList;
  const committedFromList = gc.projects.reduce((total, project) => {
    return project.status.toUpperCase() === 'ACTIVE' ? total + project.contractValue : total;
  }, 0);
  const totalCommitted = gc.totalCommitted || committedFromList;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      <StatsCard
        icon={<DollarSign className="size-5 text-success" />}
        bgClass="bg-success/10"
        label="Total Committed"
        value={formatCurrency(totalCommitted)}
        description="Active contracts"
      />
      <StatsCard
        icon={<FolderOpen className="size-5 text-info" />}
        bgClass="bg-info/10"
        label="Active Projects"
        value={activeProjects}
        description={`${gc.projects.length} total linked`}
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
