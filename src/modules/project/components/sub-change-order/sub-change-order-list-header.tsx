import { Plus } from 'lucide-react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';

interface SubChangeOrderListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function SubChangeOrderListHeader({
  hasActiveFilters,
  totalCount,
}: SubChangeOrderListHeaderProps) {
  return (
    <ResourcePageHeader
      title="Sub Change Orders"
      resultLabel="SCOs"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      addLabel="Add Sub Change Order"
      addTo="create"
      addIcon={<Plus className="size-4" />}
    />
  );
}
