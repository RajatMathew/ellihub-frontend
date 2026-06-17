import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import type { DirectoryKpis } from '@/modules/directory/schemas/contact.schema';

interface ContactListStatsProps {
  stats?: DirectoryKpis;
  isLoading?: boolean;
}

export function ContactListStats({ stats, isLoading }: ContactListStatsProps) {
  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Total Contacts',
          value: stats?.totalContacts ?? 0,
          description: 'Directory records',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Vendor Links',
          value: stats?.vendorLinks ?? 0,
          description: 'Vendor contacts',
          dotColor: 'bg-primary',
        },
        {
          label: 'GC Links',
          value: stats?.gcLinks ?? 0,
          description: 'General contractors',
          dotColor: 'bg-info',
        },
        {
          label: 'Primary',
          value: stats?.primaryContacts ?? 0,
          description: 'Marked primary',
          dotColor: 'bg-success',
        },
      ]}
    />
  );
}
