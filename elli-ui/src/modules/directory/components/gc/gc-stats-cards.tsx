import { StatsCard } from '@/app/components/ui/stats-card';
import { formatCurrency } from '@/app/lib/helpers';
import { AlertTriangle, Building2, DollarSign, FolderOpen } from 'lucide-react';

interface GCStatsCardsProps {
  activeProjects: number;
  totalCommitted: number;
  totalGCs: number;
}

export function GCStatsCards({ activeProjects, totalCommitted, totalGCs }: GCStatsCardsProps) {
  const statsItems = [
    {
      label: 'Total GCs',
      value: totalGCs,
      description: 'Approved partners',
      icon: <Building2 className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Active Projects',
      value: activeProjects,
      description: 'Current workload',
      icon: <FolderOpen className="size-6 text-info" />,
      bgClass: 'bg-info/10',
    },
    {
      label: 'Total Committed',
      value: formatCurrency(totalCommitted),
      description: 'Portfolio value',
      icon: <DollarSign className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
    {
      label: 'Compliance Alert',
      value: 0,
      description: 'Action required',
      icon: <AlertTriangle className="size-6 text-destructive" />,
      bgClass: 'bg-destructive/10',
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
