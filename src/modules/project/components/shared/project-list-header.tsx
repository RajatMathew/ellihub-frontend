import { ListPageHeader } from '@/app/components/page-header';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import { Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';

/** The project sub-resources that get their own list page. */
export type ProjectListResource = 'rfq' | 'invoice' | 'purchaseOrder' | 'subChangeOrder';

/**
 * Wording per resource. Four components differing only in these three strings
 * is four places for the copy to drift, so they live here instead.
 */
const RESOURCE_COPY: Record<
  ProjectListResource,
  { title: string; resultLabel: string; addLabel: string }
> = {
  rfq: { title: 'RFQs', resultLabel: 'RFQs', addLabel: 'Add RFQ' },
  invoice: { title: 'Invoices', resultLabel: 'Invoices', addLabel: 'Add Invoice' },
  purchaseOrder: { title: 'Purchase Orders', resultLabel: 'POs', addLabel: 'Add PO' },
  subChangeOrder: {
    title: 'Sub Change Orders',
    resultLabel: 'SCOs',
    addLabel: 'Add Sub Change Order',
  },
};

interface ProjectListHeaderProps {
  resource: ProjectListResource;
  totalCount: number;
  hasActiveFilters: boolean;
  isLoading?: boolean;
}

/**
 * The list header for a project sub-resource.
 *
 * Create permission is entity-scoped — it comes back on the project record
 * rather than from the access context — so it resolves here and is handed to
 * the action as a boolean.
 */
export function ProjectListHeader({
  resource,
  totalCount,
  hasActiveFilters,
  isLoading,
}: ProjectListHeaderProps) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const copy = RESOURCE_COPY[resource];

  return (
    <ListPageHeader
      title={copy.title}
      summary={{ total: totalCount, filtered: hasActiveFilters, label: copy.resultLabel }}
      isLoading={isLoading}
      actions={[
        {
          label: copy.addLabel,
          icon: Plus,
          to: 'create',
          placement: 'primary',
          enabled: project?.capabilities?.actions?.[resource]?.create === true,
        },
      ]}
    />
  );
}
