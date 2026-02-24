import { useMemo } from 'react';

import { Award, CheckCircle2, ClipboardList, FileText } from 'lucide-react';

import { StatsCard } from '@app/components/ui/stats-card';

import { RFQStatus, type RFQListItem } from '@modules/rfq/types';

export function RfqListStats({ data }: { data: RFQListItem[] }) {
  const stats = useMemo(
    () => ({
      total: data.length,
      draft: data.filter((r) => r.status === RFQStatus.DRAFT).length,
      open: data.filter(
        (r) => r.status === RFQStatus.PUBLISHED || r.status === RFQStatus.CLOSED,
      ).length,
      awarded: data.filter((r) => r.status === RFQStatus.AWARDED).length,
    }),
    [data],
  );

  const items = [
    {
      label: 'Total RFQ',
      value: stats.total,
      description: 'All requests for quotation',
      icon: <ClipboardList className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Draft',
      value: stats.draft,
      description: 'Not yet published',
      icon: <FileText className="size-6 text-muted-foreground" />,
      bgClass: 'bg-muted/50',
    },
    {
      label: 'Open',
      value: stats.open,
      description: 'Published or closed for quotes',
      icon: <CheckCircle2 className="size-6 text-info" />,
      bgClass: 'bg-info/10',
    },
    {
      label: 'Awarded',
      value: stats.awarded,
      description: 'Vendor selected',
      icon: <Award className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5 lg:mb-7.5">
      {items.map((item) => (
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
