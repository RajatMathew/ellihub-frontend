import { Plus } from 'lucide-react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';

interface RFQListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function RFQListHeader({ hasActiveFilters, totalCount }: RFQListHeaderProps) {
  return (
    <ResourcePageHeader
      title="RFQs"
      resultLabel="RFQs"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      addLabel="Add RFQ"
      addTo="create"
      addIcon={<Plus className="size-4" />}
    />
  );
}
