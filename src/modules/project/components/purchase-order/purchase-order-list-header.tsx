import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { Plus } from 'lucide-react';

interface PurchaseOrderListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function PurchaseOrderListHeader({
  hasActiveFilters,
  totalCount,
}: PurchaseOrderListHeaderProps) {
  const { can } = useAccess();
  const canCreate = can('purchaseOrder', 'create');

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
