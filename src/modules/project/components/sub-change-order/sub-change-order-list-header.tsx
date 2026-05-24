import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import { Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface SubChangeOrderListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function SubChangeOrderListHeader({
  hasActiveFilters,
  totalCount,
}: SubChangeOrderListHeaderProps) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const canCreate = project?.capabilities?.actions?.subChangeOrder?.create === true;

  return (
    <ResourcePageHeader
      title="Sub Change Orders"
      resultLabel="SCOs"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      addLabel={canCreate ? 'Add Sub Change Order' : undefined}
      addTo={canCreate ? 'create' : undefined}
      addIcon={canCreate ? <Plus className="size-4" /> : undefined}
    />
  );
}
