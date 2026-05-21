import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { Plus } from 'lucide-react';

interface RFQListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function RFQListHeader({ hasActiveFilters, totalCount }: RFQListHeaderProps) {
  const { can } = useAccess();
  const canCreate = can('rfq', 'create');

  return (
    <ResourcePageHeader
      title="RFQs"
      resultLabel="RFQs"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      addLabel={canCreate ? 'Add RFQ' : undefined}
      addTo={canCreate ? 'create' : undefined}
      addIcon={canCreate ? <Plus className="size-4" /> : undefined}
    />
  );
}
