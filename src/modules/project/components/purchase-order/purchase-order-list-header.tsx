import { Plus } from 'lucide-react';

import { ProjectSectionHeader } from '@/modules/project/components/shared';

interface PurchaseOrderListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function PurchaseOrderListHeader({
  hasActiveFilters,
  totalCount,
}: PurchaseOrderListHeaderProps) {
  return (
    <ProjectSectionHeader
      title="Purchase Orders"
      resultLabel="POs"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      addLabel="Add PO"
      addTo="create"
      addIcon={<Plus className="size-4" />}
    />
  );
}
