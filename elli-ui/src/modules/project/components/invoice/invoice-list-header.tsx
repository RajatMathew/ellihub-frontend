import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import { Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface InvoiceListHeaderProps {
  hasActiveFilters: boolean;
  totalCount: number;
}

export function InvoiceListHeader({ hasActiveFilters, totalCount }: InvoiceListHeaderProps) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const canCreate = project?.capabilities?.actions?.invoice?.create === true;

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
