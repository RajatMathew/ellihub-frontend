import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { Plus } from 'lucide-react';

interface InvoiceListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function InvoiceListHeader({ hasActiveFilters, totalCount }: InvoiceListHeaderProps) {
  const { can } = useAccess();
  const canCreate = can('invoice', 'create');

  return (
    <ResourcePageHeader
      title="Invoices"
      resultLabel="Invoices"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      addLabel={canCreate ? 'Add Invoice' : undefined}
      addTo={canCreate ? 'create' : undefined}
      addIcon={canCreate ? <Plus className="size-4" /> : undefined}
    />
  );
}
