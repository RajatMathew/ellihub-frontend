import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import { Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface RFQListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function RFQListHeader({ hasActiveFilters, totalCount }: RFQListHeaderProps) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const canCreate = project?.capabilities?.actions?.rfq?.create === true;

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
