import { Plus } from 'lucide-react';

import { ProjectSectionHeader } from '@/modules/project/components/shared';

interface SubChangeOrderListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function SubChangeOrderListHeader({
  hasActiveFilters,
  totalCount,
}: SubChangeOrderListHeaderProps) {
  return (
    <ProjectSectionHeader
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
