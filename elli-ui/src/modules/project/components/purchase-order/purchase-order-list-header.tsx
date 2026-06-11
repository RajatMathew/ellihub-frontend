import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import { Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface PurchaseOrderListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function PurchaseOrderListHeader({
  hasActiveFilters,
  totalCount,
}: PurchaseOrderListHeaderProps) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const canCreate = project?.capabilities?.actions?.purchaseOrder?.create === true;

  return (
    <ResourcePageHeader
      title="Purchase Orders"
      resultLabel="POs"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      addLabel={canCreate ? 'Add PO' : undefined}
      addTo={canCreate ? 'create' : undefined}
      addIcon={canCreate ? <Plus className="size-4" /> : undefined}
    />
  );
}
