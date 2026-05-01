import { Plus } from 'lucide-react';

import { ProjectSectionHeader } from '@/modules/project/components/shared';

interface InvoiceListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function InvoiceListHeader({ hasActiveFilters, totalCount }: InvoiceListHeaderProps) {
  return (
    <ProjectSectionHeader
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
