import { Plus } from 'lucide-react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';

interface InvoiceListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function InvoiceListHeader({ hasActiveFilters, totalCount }: InvoiceListHeaderProps) {
  return (
    <ResourcePageHeader
      title="Invoices"
      resultLabel="Invoices"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      addLabel="Add Invoice"
      addTo="create"
      addIcon={<Plus className="size-4" />}
    />
  );
}
