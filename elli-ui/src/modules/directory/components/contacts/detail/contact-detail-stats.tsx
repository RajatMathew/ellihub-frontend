import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';

interface ContactDetailStatsProps {
  roleName: string | null;
  entityCount: number;
  tagCount: number;
}

export function ContactDetailStats({ roleName, entityCount, tagCount }: ContactDetailStatsProps) {
  const statsItems = [
    {
      label: 'Role',
      value: roleName ?? '-',
      description: 'Professional role',
      dotColor: 'bg-primary',
    },
    {
      label: 'Companies',
      value: entityCount,
      description: 'Linked entities',
      dotColor: 'bg-success',
    },
    {
      label: 'Tags',
      value: tagCount,
      description: 'Classifications',
      dotColor: 'bg-info',
    },
    {
      label: 'Projects',
      value: '-',
      description: 'Coming soon',
      dotColor: 'bg-warning',
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
