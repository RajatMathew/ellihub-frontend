import { useMemo } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency } from '@/app/lib/helpers';
import { getPurchaseOrderTotalCommitment } from '@/modules/directory/components/vendors/vendor-commitment-utils';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';
import type { POListItem } from '@/modules/project/schemas/purchase-order';
import { ExternalLink, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VendorProjectsTabProps {
  vendor: VendorDetail;
}

type VendorCommittedProject = {
  projectId: string;
  projectName: string;
  jobNumber?: string | null;
  status?: string | null;
  totalCommitted: number;
  purchaseOrderCount: number;
};

export function VendorProjectsTab({ vendor }: VendorProjectsTabProps) {
  const purchaseOrdersQuery = usePOsQuery({
    vendorId: vendor.id,
    page: 1,
    size: 1000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const committedProjects = useMemo(
    () => getCommittedProjectsFromPurchaseOrders(purchaseOrdersQuery.data?.data ?? []),
    [purchaseOrdersQuery.data?.data]
  );
  const totalCommitted = committedProjects.reduce(
    (sum, project) => sum + project.totalCommitted,
    0
  );

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Committed Projects
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            {committedProjects.length} project{committedProjects.length === 1 ? '' : 's'} with
            active purchase orders
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Total Committed
          </div>
          <div className="text-lg font-semibold text-foreground">
            {formatCurrency(totalCommitted)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {purchaseOrdersQuery.isLoading ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Loading committed projects...
          </div>
        ) : purchaseOrdersQuery.isError ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Unable to load committed projects.
          </div>
        ) : committedProjects.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <FolderOpen className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No committed projects</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Projects with active purchase orders for this vendor will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {committedProjects.map((project) => (
              <CommittedProjectRow key={project.projectId} project={project} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommittedProjectRow({ project }: { project: VendorCommittedProject }) {
  const status = project.status?.toUpperCase();

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            to={`/app/project/${project.projectId}/overview`}
            className="min-w-0 break-words text-sm font-semibold text-foreground hover:text-primary"
          >
            {project.projectName}
          </Link>
          {status && (
            <Badge variant="secondary" appearance="outline" size="sm" className="w-fit shrink-0">
              {status}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {project.jobNumber || 'No job number'} · {project.purchaseOrderCount} purchase order
          {project.purchaseOrderCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-4 sm:shrink-0">
        <div className="min-w-0 text-left sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Committed
          </div>
          <div className="text-sm font-semibold text-foreground">
            {formatCurrency(project.totalCommitted)}
          </div>
        </div>
        <Link
          to={`/app/project/${project.projectId}/overview`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary"
          aria-label={`Open ${project.projectName}`}
        >
          <ExternalLink className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function getCommittedProjectsFromPurchaseOrders(purchaseOrders: POListItem[]) {
  const projectsById = new Map<string, VendorCommittedProject>();

  for (const purchaseOrder of purchaseOrders) {
    if (purchaseOrder.status === 'CANCELLED') continue;

    const projectId = purchaseOrder.project?.id ?? purchaseOrder.projectId;
    const existing = projectsById.get(projectId);
    const total = getPurchaseOrderTotalCommitment(purchaseOrder);

    if (existing) {
      existing.totalCommitted += total;
      existing.purchaseOrderCount += 1;
      continue;
    }

    projectsById.set(projectId, {
      projectId,
      projectName: purchaseOrder.project?.name || projectId,
      jobNumber: purchaseOrder.project?.jobNumber,
      status: purchaseOrder.project?.status,
      totalCommitted: total,
      purchaseOrderCount: 1,
    });
  }

  return Array.from(projectsById.values()).sort(
    (first, second) => second.totalCommitted - first.totalCommitted
  );
}
