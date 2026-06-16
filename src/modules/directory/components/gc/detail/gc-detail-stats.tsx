import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { formatCurrency } from '@/app/lib/helpers';
import { PAYMENT_TERMS_LABELS } from '@/modules/directory/constants/shared.constants';
import type { GeneralContractorDetail } from '@/modules/directory/schemas/gc.schema';

import { getGCProjectMetrics } from './gc-project-metrics';

interface GCDetailStatsProps {
  gc: GeneralContractorDetail;
  contactCount: number;
}

export function GCDetailStats({ gc, contactCount }: GCDetailStatsProps) {
  const { activeProjects, totalCommitted, totalProjects } = getGCProjectMetrics(gc);
  const statsItems = [
    {
      label: 'Total Committed',
      value: formatCurrency(totalCommitted),
      description: 'Active contracts',
      dotColor: 'bg-success',
    },
    {
      label: 'Active Projects',
      value: activeProjects,
      description: `${totalProjects} total linked`,
      dotColor: 'bg-info',
    },
    {
      label: 'Team Contacts',
      value: contactCount,
      description: 'Linked contacts',
      dotColor: 'bg-warning',
    },
    {
      label: 'Retainage',
      value: `${gc.retainagePercent}%`,
      description: gc.paymentTerms
        ? (PAYMENT_TERMS_LABELS[gc.paymentTerms] ?? gc.paymentTerms)
        : 'No terms',
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
