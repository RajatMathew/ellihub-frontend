import { Plus } from 'lucide-react';

import { ProjectSectionHeader } from '@/modules/project/components/shared';

interface RFQListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function RFQListHeader({ hasActiveFilters, totalCount }: RFQListHeaderProps) {
  return (
    <ProjectSectionHeader
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
