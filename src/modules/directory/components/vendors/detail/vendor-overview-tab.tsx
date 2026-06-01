import { useMemo } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { formatCurrency } from '@/app/lib/helpers';
import { ContactCard } from '@/modules/directory/components/contact-card';
import type { DirectoryContactSnapshot } from '@/modules/directory/components/shared';
import { PAYMENT_TERMS_LABELS } from '@/modules/directory/constants/shared.constants';
import {
  VENDOR_STATUS_COLORS,
  VENDOR_STATUS_LABELS,
} from '@/modules/directory/constants/vendors/vendor-detail.constants';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';
import type { POListItem } from '@/modules/project/schemas/purchase-order';
import { ExternalLink, FolderOpen, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getVendorTypeLabel } from './vendor-detail-utils';

interface VendorOverviewTabProps {
  vendor: VendorDetail;
  contacts: DirectoryContactSnapshot[];
}

export function VendorOverviewTab({ vendor, contacts }: VendorOverviewTabProps) {
  return (
    <div className="space-y-5">
      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <VendorFinancialCard vendor={vendor} />
        <VendorInfoCard vendor={vendor} />
      </div>

      <VendorCommittedProjectsCard vendor={vendor} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Team Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length > 0 ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="rounded-lg border border-border p-4">
                  <ContactCard
                    fullName={contact.fullName}
                    email={contact.email?.[0]?.email ?? null}
                    phone={contact.phoneNumber?.[0]?.number ?? null}
                    isPrimary={contact.isPrimary}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <UserMinus className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type VendorCommittedProject = {
  projectId: string;
  projectName: string;
  jobNumber?: string | null;
  status?: string | null;
  totalCommitted: number;
  purchaseOrderCount: number;
};

function VendorCommittedProjectsCard({ vendor }: { vendor: VendorDetail }) {
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
            {formatCurrency(vendor.totalCommitted)}
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
    const total = Number(purchaseOrder.total ?? 0);

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

function VendorFinancialCard({ vendor }: { vendor: VendorDetail }) {
  const rows = [
    { label: 'Total Committed', value: formatCurrency(vendor.totalCommitted) },
    { label: 'Paid to Date', value: formatCurrency(vendor.totalPaid) },
    { label: 'Outstanding', value: formatCurrency(vendor.outstandingBalance) },
    { label: 'Current Balance', value: formatCurrency(vendor.currentBalance) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {rows.map((row, index) => (
          <div key={row.label}>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-semibold text-foreground">{row.value}</span>
            </div>
            {index < rows.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function VendorInfoCard({ vendor }: { vendor: VendorDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm text-muted-foreground">Vendor Type</span>
          <span className="break-words text-right text-sm font-medium text-foreground">
            {getVendorTypeLabel(vendor)}
          </span>
        </div>
        <Separator />
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm text-muted-foreground">Payment Terms</span>
          <Badge variant="secondary" size="sm" className="min-w-0 break-words text-right">
            {vendor.paymentTerms ? PAYMENT_TERMS_LABELS[vendor.paymentTerms] : '-'}
          </Badge>
        </div>
        <Separator />
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm text-muted-foreground">Default Status</span>
          <div className="flex min-w-0 items-center gap-1.5 text-right">
            <span
              className={`size-2 rounded-full ${
                VENDOR_STATUS_COLORS[vendor.status] ?? 'bg-muted-foreground'
              }`}
            />
            <span className="break-words text-sm font-medium">
              {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
            </span>
          </div>
        </div>
        <Separator />
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm text-muted-foreground">Tax ID / EIN</span>
          <span className="break-words text-right text-sm font-medium text-foreground">
            {vendor.taxId || '-'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
