import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';

interface RFQListStatsProps {
  total: number;
  active: number;
  awarded: number;
}

export function RFQListStats({ total, active, awarded }: RFQListStatsProps) {
  return (
    <StatsBar variant="cards" className="mb-5 lg:mb-7.5">
      <StatsBarItem
        variant="card"
        label="Total RFQs"
        value={total}
        dotColor="bg-label-lighter"
        valueColor="text-foreground"
        valueSize="big"
        className="w-56 sm:w-64"
      />
      <StatsBarItem
        variant="card"
        label="Active"
        value={active}
        description="Published & Evaluation"
        dotColor="bg-primary"
        valueColor="text-foreground"
        valueSize="big"
        className="w-56 sm:w-64"
      />
      <StatsBarItem
        variant="card"
        label="Awarded"
        value={awarded}
        dotColor="bg-success"
        valueColor="text-foreground"
        valueSize="big"
        className="w-56 sm:w-64"
      />
    </StatsBar>
  );
}
