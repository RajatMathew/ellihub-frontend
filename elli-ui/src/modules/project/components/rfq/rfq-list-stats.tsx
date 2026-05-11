import { ClipboardList, Send, Trophy } from 'lucide-react';

import { StatsCard } from '@/app/components/ui/stats-card';

interface RFQListStatsProps {
  total: number;
  active: number;
  awarded: number;
}

export function RFQListStats({ total, active, awarded }: RFQListStatsProps) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mb-7.5 lg:grid-cols-3">
      <StatsCard
        icon={<ClipboardList className="size-6 text-muted-foreground" />}
        bgClass="bg-muted/50"
        label="Total RFQs"
        value={total}
      />
      <StatsCard
        icon={<Send className="size-6 text-primary" />}
        bgClass="bg-primary/10"
        label="Active"
        value={active}
        description="Published & Evaluation"
      />
      <StatsCard
        icon={<Trophy className="size-6 text-success" />}
        bgClass="bg-success/10"
        label="Awarded"
        value={awarded}
      />
    </div>
  );
}
