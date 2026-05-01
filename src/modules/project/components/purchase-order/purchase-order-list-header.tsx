import { Plus } from 'lucide-react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';

interface PurchaseOrderListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function PurchaseOrderListHeader({
  hasActiveFilters,
  totalCount,
}: PurchaseOrderListHeaderProps) {
  return (
    <ResourcePageHeader
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
