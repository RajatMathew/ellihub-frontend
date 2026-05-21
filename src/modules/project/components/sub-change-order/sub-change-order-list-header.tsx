import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { Plus } from 'lucide-react';

interface SubChangeOrderListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function SubChangeOrderListHeader({
  hasActiveFilters,
  totalCount,
}: SubChangeOrderListHeaderProps) {
  const { can } = useAccess();
  const canCreate = can('subChangeOrder', 'create');

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
