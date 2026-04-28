import { useState } from 'react';

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Link2,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  ShieldAlert,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { Textarea } from '@app/components/ui/textarea';
import { useBreadcrumbLabel } from '@app/hooks/use-breadcrumb-label';
import { formatCurrency, formatDate } from '@app/lib/helpers';

import { UploadFileDialog } from '@modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@modules/files/hooks/files.hooks';
import { useCostCodesQuery } from '@modules/catalog/hooks';
import { DetailSidebar } from '@modules/directory/components';
import { InfoRow } from '@modules/project/components/info-row';
import { useProjectFolderQuery } from '@modules/project/hooks/use-project-folder';
import { usePODetailQuery } from '@modules/purchase-orders/hooks/po.hooks';
import { useAddSCOAttachmentMutation, useRemoveSCOAttachmentMutation } from '@modules/sco/hooks/sco-attachment.hooks';
import { SCO_STATUS_COLORS } from '@modules/sco/constants/sco.constants';
import {
  useApproveSCOMutation,
  useRejectSCOMutation,
  useRevertSCOToDraftMutation,
  useSCODetailQuery,
  useVoidSCOMutation,
} from '@modules/sco/hooks/sco.hooks';
import { useActivityLogQuery } from '@modules/directory/hooks/activity.hooks';
import { ActivityFeed, type ActivityItem } from '@core/ui/components/sections/activity-feed';
import { useMemo } from 'react';
import { Clock, DollarSign, History, PlusCircle, TrendingUp } from 'lucide-react';

/* eslint-disable react-refresh/only-export-components -- constant workflow definition used by this page component */

/* ---- Workflow transition definitions ---- */

type WorkflowAction = {
  label: string;
  endpoint: 'approve' | 'reject' | 'void';
  needsReason: boolean;
  minReasonLength?: number;
  primary?: boolean;
  destructive?: boolean;
};

export const WORKFLOW_ACTIONS: Record<string, WorkflowAction[]> = {
  DRAFT: [
    { label: 'Approve', endpoint: 'approve', needsReason: false, primary: true },
    { label: 'Reject', endpoint: 'reject', needsReason: true, destructive: true },
  ],
  APPROVED: [
    { label: 'Void', endpoint: 'void', needsReason: true, destructive: true },
  ],
  // REJECTED and VOID are terminal — no actions
};

function lookupLabel(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const ref = value as {
      label?: unknown;
      name?: unknown;
      code?: unknown;
      type?: unknown;
      id?: unknown;
    };
    return lookupLabel(ref.label ?? ref.name ?? ref.code ?? ref.type ?? ref.id);
  }
  return String(value);
}

function money(value: unknown): string {
  const numeric = Number(value ?? 0);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
}

function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm font-semibold text-foreground">{children ?? '-'}</div>
    </div>
  );
}

/* ---- Page ---- */

export function SCODetailPage() {
  const { projectId = '', scoId = '' } = useParams<{ projectId: string; scoId: string }>();

  const { data: sco, isLoading } = useSCODetailQuery(scoId);
  const purchaseOrderId = sco?.purchaseOrderId ?? sco?.purchaseOrder?.id ?? '';
  const { data: purchaseOrderDetail, isFetching: isPurchaseOrderFetching } =
    usePODetailQuery(purchaseOrderId);
  useBreadcrumbLabel(
    projectId && scoId ? `/app/project/${projectId}/sub-change-order/${scoId}` : undefined,
    sco?.scoNumber ?? sco?.title ?? undefined,
  );
  const { data: costCodesData } = useCostCodesQuery();
  const { data: scoFolderId } = useProjectFolderQuery(projectId || undefined, 'prime co');

  const approveMutation = useApproveSCOMutation();
  const rejectMutation = useRejectSCOMutation();
  const voidMutation = useVoidSCOMutation();
  const revertToDraftMutation = useRevertSCOToDraftMutation();
  const addAttachmentMutation = useAddSCOAttachmentMutation();
  const removeAttachmentMutation = useRemoveSCOAttachmentMutation();
  const uploadFileMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

  const costCodeMap = new Map(
    (costCodesData?.data ?? []).map((cc) => [cc.id, `${cc.code} - ${cc.name}`]),
  );
  const attachments = (sco?.attachments ?? []) as { id: string; documentId?: string; document?: { id: string; name: string } }[];

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Workflow dialog state
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);
  const [actionReason, setActionReason] = useState('');

  const { data: activityData, isLoading: isActivityLoading } = useActivityLogQuery({
    entityType: 'subChangeOrder',
    entityId: scoId,
    size: 50,
  });

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!activityData?.data) return [];
    return activityData.data.map((log) => {
      const action = log.action.toLowerCase();
      let icon = <Clock className="size-4" />;
      let color = "border-muted-foreground/20 bg-muted/30";

      if (action.includes('create') || action.includes('draft')) {
        icon = <PlusCircle className="size-4 text-primary" />;
        color = "border-primary/20 bg-primary/5";
      } else if (action.includes('update')) {
        icon = <Pencil className="size-4 text-info" />;
        color = "border-info/20 bg-info/5";
      } else if (action.includes('approve') || action.includes('execute')) {
        icon = <CheckCircle2 className="size-4 text-success" />;
        color = "border-success/20 bg-success/5";
      } else if (action.includes('delete') || action.includes('reject') || action.includes('void')) {
        icon = <Trash2 className="size-4 text-destructive" />;
        color = "border-destructive/20 bg-destructive/5";
      }

      return {
        id: log.id,
        user: log.user?.name || 'System',
        action: log.description,
        timestamp: log.createdAt ? new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
        avatar: log.user?.image || undefined,
        icon,
        color,
      };
    });
  }, [activityData]);

  const statusName =
    typeof sco?.status === 'string' ? sco.status : sco?.status?.name ?? '';
  const statusLabel =
    typeof sco?.status === 'string'
      ? sco.status
      : sco?.status?.label ?? statusName;
  const isDraft = statusName === 'DRAFT';
  const isApproved = statusName === 'APPROVED';
  const isRejected = statusName === 'REJECTED';
  const isVoid = statusName === 'VOID';

  const canApprove = isDraft;
  const canReject = isDraft;
  const canVoid = isApproved;
  const canRevert = !isDraft;
  const canEdit = isDraft;


  /* ---- Execute a workflow action ---- */
  function executeAction(action: WorkflowAction, reason?: string) {
    const onSuccess = () => {
      setActiveAction(null);
      setActionReason('');
    };

    if (action.endpoint === 'approve') {
      approveMutation.mutate(scoId, { onSuccess });
    } else if (action.endpoint === 'reject') {
      rejectMutation.mutate({ id: scoId, data: { reason: reason! } }, { onSuccess });
    } else if (action.endpoint === 'void') {
      voidMutation.mutate({ id: scoId, data: { reason: reason! } }, { onSuccess });
    }
  }

  function handleActionClick(action: WorkflowAction) {
    setActiveAction(action);
    if (action.needsReason) setActionReason('');
  }

  const isActionPending =
    approveMutation.isPending || rejectMutation.isPending || voidMutation.isPending || revertToDraftMutation.isPending;

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading change order...</div>
      </div>
    );
  }

  if (!sco) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Change order not found.</div>
      </div>
    );
  }

  const amount = Number(sco.amount ?? 0);
  const markupAmount = Number(sco.markupAmount ?? 0);
  const totalAmount = amount + markupAmount;
  const embeddedPurchaseOrder = sco.purchaseOrder as
    | {
        id?: string;
        poNumber?: string | null;
        description?: string | null;
        expectedDate?: string | null;
        deliveryDate?: string | null;
        leadTime?: string | null;
        paymentTerms?: string | null;
        tradeCategory?: unknown;
        tradeCategoryLabel?: string | null;
        total?: string | number | null;
        status?: string | null;
        vendor?: { name?: string | null } | null;
      }
    | undefined;
  const linkedPurchaseOrder = purchaseOrderDetail ?? embeddedPurchaseOrder;
  const purchaseOrderTotal = Number(linkedPurchaseOrder?.total ?? 0);
  const scheduleImpactDays = Number(sco.scheduleImpactDays ?? 0);
  const purchaseOrderLabel = linkedPurchaseOrder?.poNumber ?? sco.purchaseOrderId ?? '-';
  const purchaseOrderVendor = purchaseOrderDetail?.vendor?.name ?? embeddedPurchaseOrder?.vendor?.name ?? sco.vendor?.name ?? '-';
  const purchaseOrderStatus = lookupLabel(purchaseOrderDetail?.status ?? embeddedPurchaseOrder?.status);
  const purchaseOrderTradeCategory =
    purchaseOrderDetail?.tradeCategoryLabel ??
    lookupLabel(embeddedPurchaseOrder?.tradeCategory ?? embeddedPurchaseOrder?.tradeCategoryLabel);
  const purchaseOrderPaymentTerms = linkedPurchaseOrder?.paymentTerms
    ? String(linkedPurchaseOrder.paymentTerms).replace(/_/g, ' ')
    : '-';
  const purchaseOrderExpectedDate = linkedPurchaseOrder?.expectedDate
    ? formatDate(linkedPurchaseOrder.expectedDate)
    : '-';
  const purchaseOrderDeliveryDate = linkedPurchaseOrder?.deliveryDate
    ? formatDate(linkedPurchaseOrder.deliveryDate)
    : '-';
  const purchaseOrderLineItemCount = purchaseOrderDetail?.lineItems?.length ?? 0;
  const purchaseOrderAttachmentCount = purchaseOrderDetail?.attachments?.length ?? 0;
  const hasReasonBanner =
    (isRejected && sco.rejectionReason) || (isVoid && sco.voidReason);

  return (
    <div className="container-fluid max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7.5 lg:py-7.5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Sub Change Order
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToolbarPageTitle>
                {sco.scoNumber ?? sco.title ?? 'Sub Change Order'}
              </ToolbarPageTitle>
              {sco.status && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-2 rounded-full ${SCO_STATUS_COLORS[statusName] ?? 'bg-muted-foreground'}`}
                  />
                  <span className="text-sm text-muted-foreground">{statusLabel}</span>
                </div>
              )}
              {sco.changeType && (
                <Badge variant="primary" appearance="outline" size="sm">
                  {lookupLabel(sco.changeType)}
                </Badge>
              )}
              {sco.impactsSchedule && (
                <Badge variant="warning" appearance="outline" size="sm">
                  Schedule Impact
                </Badge>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            {/* Approve — only on DRAFT */}
            {canApprove && (
              <Button
                size="sm"
                disabled={isActionPending}
                onClick={() => handleActionClick({ label: 'Approve', endpoint: 'approve', needsReason: false })}
              >
                <CheckCircle2 className="size-4" />
                Approve
              </Button>
            )}

            {/* Revert to Draft — on APPROVED */}
            {canReject && (
              <Button
                variant="destructive"
                size="sm"
                disabled={isActionPending}
                onClick={() => handleActionClick({ label: 'Reject', endpoint: 'reject', needsReason: true, destructive: true })}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            )}

            {/* Void — on APPROVED */}
            {canVoid && (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionPending}
                onClick={() => handleActionClick({ label: 'Void', endpoint: 'void', needsReason: true, destructive: true })}
              >
                <ShieldAlert className="size-4" />
                Void
              </Button>
            )}

            {/* Edit — only on DRAFT */}
            {canEdit && (
              <Button variant="outline" size="sm" asChild>
                <Link to="edit">
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
            )}

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" mode="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canEdit && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                )}
                {canRevert && (
                  <DropdownMenuItem onClick={() => revertToDraftMutation.mutate(scoId)}>
                    <Clock className="size-4" />
                    Revert to Draft
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {!sidebarOpen && (
              <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)}>
                <PanelRightOpen className="size-4" />
                Details
              </Button>
            )}
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-5">
        <StatsCard
          icon={<DollarSign className="size-5 text-primary" />}
          bgClass="bg-primary/10"
          label="SCO Amount"
          value={money(amount)}
          description="Line item total"
        />
        <StatsCard
          icon={<TrendingUp className="size-5 text-muted-foreground" />}
          bgClass="bg-muted/60"
          label="Markup"
          value={money(markupAmount)}
          description="Added markup"
        />
        <StatsCard
          icon={<ClipboardList className="size-5 text-info" />}
          bgClass="bg-info/10"
          label="Total"
          value={money(totalAmount)}
          description="SCO total"
        />
        <StatsCard
          icon={<Link2 className="size-5 text-success" />}
          bgClass="bg-success/10"
          label="Linked PO"
          value={purchaseOrderLabel}
          description={String(purchaseOrderStatus)}
        />
        <StatsCard
          icon={<Calendar className="size-5 text-warning" />}
          bgClass="bg-warning/10"
          label="Schedule"
          value={`${scheduleImpactDays} day${scheduleImpactDays === 1 ? '' : 's'}`}
          description={sco.impactsSchedule ? 'Impacts schedule' : 'No schedule impact'}
        />
      </div>

      {hasReasonBanner && (
        <div className="rounded-lg border border-muted bg-muted/30 px-5 py-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <AlertTriangle className="size-4" />
            {isRejected ? 'Rejection Reason' : 'Void Reason'}
          </div>
          <p className="text-sm text-foreground">
            {isRejected ? sco.rejectionReason : sco.voidReason}
          </p>
        </div>
      )}

          {/* General Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Sub Change Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {sco.scoNumber && <InfoRow label="SCO #">{sco.scoNumber}</InfoRow>}
              <InfoRow label="Title">{sco.title}</InfoRow>
              <InfoRow label="Date">{sco.date ? formatDate(sco.date) : '—'}</InfoRow>
              <InfoRow label="Change Type">
                {sco.changeType ? (
                  <Badge variant="primary" appearance="light" size="sm">
                    {lookupLabel(sco.changeType)}
                  </Badge>
                ) : (
                  '—'
                )}
              </InfoRow>
              {/* Hidden until /sub-change-order/{id} includes priority. */}
              {/* Hidden until /sub-change-order/{id} includes initiatedBy. */}
              <InfoRow label="Purchase Order">
                {purchaseOrderLabel}
              </InfoRow>
              <InfoRow label="Vendor">{purchaseOrderVendor}</InfoRow>
              {/* Hidden until /sub-change-order/{id} includes vendorContactName. */}
              {/* Hidden until /sub-change-order/{id} includes vendorContactEmail. */}
              {/* Hidden until /sub-change-order/{id} includes vendorReferenceNumber. */}
              {sco.scheduleImpactDays != null && sco.scheduleImpactDays > 0 && (
                <InfoRow label="Schedule Impact">
                  {sco.scheduleImpactDays} day{sco.scheduleImpactDays !== 1 ? 's' : ''}
                </InfoRow>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Purchase Order
                </CardTitle>
                {isPurchaseOrderFetching && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Loading purchase order details...
                  </div>
                )}
              </div>
              {linkedPurchaseOrder?.id && (
                <Link
                  to={`/app/project/${projectId}/purchase-orders/${linkedPurchaseOrder.id}`}
                  className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  View PO
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                <DetailField label="PO Number">{purchaseOrderLabel}</DetailField>
                <DetailField label="Vendor">{purchaseOrderVendor}</DetailField>
                <DetailField label="PO Status">{purchaseOrderStatus}</DetailField>
                <DetailField label="PO Total">
                  {purchaseOrderTotal ? money(purchaseOrderTotal) : '-'}
                </DetailField>
                <DetailField label="Trade Category">{purchaseOrderTradeCategory}</DetailField>
                <DetailField label="Expected Date">{purchaseOrderExpectedDate}</DetailField>
                <DetailField label="Delivery Date">{purchaseOrderDeliveryDate}</DetailField>
                <DetailField label="Payment Terms">{purchaseOrderPaymentTerms}</DetailField>
                <DetailField label="Lead Time">{linkedPurchaseOrder?.leadTime ?? '-'}</DetailField>
                <DetailField label="PO Line Items">{purchaseOrderLineItemCount}</DetailField>
                <DetailField label="PO Attachments">{purchaseOrderAttachmentCount}</DetailField>
              </div>
              {linkedPurchaseOrder?.description && (
                <div className="mt-5 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {linkedPurchaseOrder.description}
                </div>
              )}
              {purchaseOrderDetail?.lineItems?.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[640px] w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          PO Item
                        </th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">
                          Qty
                        </th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Unit
                        </th>
                        <th className="pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrderDetail.lineItems.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-4">
                            <div className="font-medium">{item.description}</div>
                            {item.notes && (
                              <div className="mt-1 text-xs text-muted-foreground">{item.notes}</div>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 pr-4">{lookupLabel(item.unit ?? item.unitId)}</td>
                          <td className="py-2.5 text-right font-medium tabular-nums">
                            {money(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Description */}
          {sco.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sco.description && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {sco.description}
                  </p>
                )}
                {/* Hidden until /sub-change-order/{id} includes reasonForChange. */}
                {/* Hidden until /sub-change-order/{id} includes detailedScope. */}
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Line Items ({sco.lineItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sco.lineItems.length > 0 ? (
                <>
                <div className="space-y-3 md:hidden">
                  {sco.lineItems.map((li, idx) => (
                    <div key={li.id} className="rounded-lg border p-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Line {idx + 1}
                          </div>
                          <div className="mt-1 break-words text-sm font-semibold text-foreground">
                            {li.description}
                          </div>
                          {li.notes && (
                            <div className="mt-1 break-words text-xs text-muted-foreground">
                              {li.notes}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                          {money(li.amount)}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">Qty</div>
                          <div className="font-medium tabular-nums">
                            {li.quantity ?? li.qty ?? '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Unit</div>
                          <div className="font-medium">{lookupLabel(li.unit ?? li.unitId)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Unit Price</div>
                          <div className="font-medium tabular-nums">{money(li.unitPrice)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cost Code</div>
                          <div className="break-words font-medium">
                            {li.costCodeId ? costCodeMap.get(li.costCodeId) ?? '-' : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <InfoRow label="Subtotal">{money(sco.amount)}</InfoRow>
                    {Number(sco.markupAmount ?? 0) !== 0 && (
                      <InfoRow label="Markup">{money(sco.markupAmount)}</InfoRow>
                    )}
                    {/* Hidden until /sub-change-order/{id} includes taxAmount/taxPercent. */}
                    <Separator className="my-2" />
                    <InfoRow label="Total">
                      <span className="font-semibold">
                        {money(Number(sco.amount ?? 0) + Number(sco.markupAmount ?? 0))}
                      </span>
                    </InfoRow>
                  </div>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          #
                        </th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Description
                        </th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[160px]">
                          Cost Code
                        </th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">
                          Qty
                        </th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Unit
                        </th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">
                          Unit Price
                        </th>
                        <th className="pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sco.lineItems.map((li, idx) => (
                        <tr key={li.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-4 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 pr-4">
                            <div className="font-medium">{li.description}</div>
                            {li.notes && (
                              <div className="mt-1 text-xs text-muted-foreground">{li.notes}</div>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                            {li.costCodeId ? costCodeMap.get(li.costCodeId) ?? '—' : '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {li.quantity ?? li.qty ?? '—'}
                          </td>
                          <td className="py-2.5 pr-4">{lookupLabel(li.unit ?? li.unitId)}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {money(li.unitPrice)}
                          </td>
                          <td className="py-2.5 text-right font-medium tabular-nums">
                            {money(li.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={6} className="pt-3 text-right text-xs text-muted-foreground">
                          Subtotal
                        </td>
                        <td className="pt-3 text-right tabular-nums text-sm">
                          {formatCurrency(sco.amount)}
                        </td>
                      </tr>
                      {Number(sco.markupAmount ?? 0) !== 0 && (
                        <tr>
                          <td colSpan={6} className="pt-1 text-right text-xs text-muted-foreground">
                            Markup
                          </td>
                          <td className="pt-1 text-right tabular-nums text-sm">
                            {money(sco.markupAmount)}
                          </td>
                        </tr>
                      )}
                      {/* Hidden until /sub-change-order/{id} includes taxAmount/taxPercent. */}
                      <tr className="border-t">
                        <td
                          colSpan={6}
                          className="pt-2 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                        >
                          Total
                        </td>
                        <td className="pt-2 text-right font-semibold tabular-nums">
                          {formatCurrency(Number(sco.amount ?? 0) + Number(sco.markupAmount ?? 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No line items.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents / Attachments */}
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Documents ({attachments.length})
              </CardTitle>
              {isDraft && scoFolderId && (
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload className="size-4" />
                  Upload
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {att.document?.name ?? 'Document'}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                        {att.document?.id && (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => downloadFile.mutate(att.document!)}
                          >
                            <Download className="size-3.5" />
                          </Button>
                        )}
                        {isDraft && (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => removeAttachmentMutation.mutate({ scoId, attachmentId: att.id })}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No documents attached.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activityChildren={
            <div className="p-4">
              {isActivityLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground uppercase tracking-widest">
                  Loading activity...
                </div>
              ) : activityItems.length > 0 ? (
                <ActivityFeed items={activityItems} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <History className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">No activity recorded yet.</p>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-6 pt-2">
            {/* Financial Summary */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Financial Summary
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <InfoRow label="Subtotal">{money(sco.amount)}</InfoRow>
                  {Number(sco.markupAmount ?? 0) !== 0 && (
                    <InfoRow label="Markup">{money(sco.markupAmount)}</InfoRow>
                  )}
                  {/* Hidden until /sub-change-order/{id} includes taxAmount/taxPercent. */}
                  <Separator className="my-2" />
                  <InfoRow label="Total">
                    <span className="font-semibold">
                      {money(Number(sco.amount ?? 0) + Number(sco.markupAmount ?? 0))}
                    </span>
                  </InfoRow>
                  {/* Hidden until /sub-change-order/{id} includes retainagePercent. */}
                  {/* Hidden until /sub-change-order/{id} includes paymentTerms. */}
                  <Separator className="my-2" />
                  <InfoRow label="Purchase Order">
                    {purchaseOrderLabel}
                  </InfoRow>
                  <InfoRow label="PO Total">
                    {purchaseOrderTotal ? money(purchaseOrderTotal) : '—'}
                  </InfoRow>
                  <InfoRow label="PO Vendor">
                    {purchaseOrderVendor}
                  </InfoRow>
                </CardContent>
              </Card>
            </div>

            {/* Timeline */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Timeline
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {sco.createdAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="size-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="text-sm font-medium">{formatDate(sco.createdAt)}</div>
                      </div>
                    </div>
                  )}
                  {sco.approvedAt && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-4 text-success mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Approved</div>
                        <div className="text-sm font-medium">{formatDate(sco.approvedAt)}</div>
                      </div>
                    </div>
                  )}
                  {sco.rejectedAt && (
                    <div className="flex items-start gap-3">
                      <XCircle className="size-4 text-destructive mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Rejected</div>
                        <div className="text-sm font-medium">{formatDate(sco.rejectedAt)}</div>
                        {sco.rejectionReason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {sco.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {sco.voidedAt && (
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="size-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Voided</div>
                        <div className="text-sm font-medium">{formatDate(sco.voidedAt)}</div>
                        {sco.voidReason && (
                          <p className="text-xs text-muted-foreground mt-1">{sco.voidReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DetailSidebar>
      </div>

      {/* ---- Workflow action dialog (no reason) ---- */}
      {activeAction && !activeAction.needsReason && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
          title={activeAction.label}
          description={
            <>
              Are you sure you want to <strong>{activeAction.label.toLowerCase()}</strong>{' '}
              <strong>{sco.scoNumber ? `SCO ${sco.scoNumber}` : sco.title}</strong>
              {activeAction.endpoint === 'approve' ? (
                <>
                  {' '}
                  for <strong>{formatCurrency(sco.amount)}</strong>
                </>
              ) : null}
              ?
            </>
          }
          confirmLabel={activeAction.label}
          variant={activeAction.destructive ? 'destructive' : 'default'}
          onConfirm={() => executeAction(activeAction)}
          isPending={isActionPending}
        />
      )}

      {/* ---- Workflow action dialog (with reason) ---- */}
      {activeAction && activeAction.needsReason && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setActiveAction(null);
              setActionReason('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{activeAction.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Provide a reason for this action on{' '}
                <strong>{sco.scoNumber ? `SCO ${sco.scoNumber}` : sco.title}</strong>.
              </p>
              <Textarea
                placeholder={`Reason${(activeAction.minReasonLength ?? 1) > 1 ? ` (min ${activeAction.minReasonLength} characters)` : ''}...`}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
              />
              {actionReason.length > 0 &&
                actionReason.length < (activeAction.minReasonLength ?? 1) && (
                  <p className="text-xs text-destructive">
                    Reason must be at least {activeAction.minReasonLength} characters (
                    {(activeAction.minReasonLength ?? 1) - actionReason.length} more needed).
                  </p>
                )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveAction(null);
                  setActionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant={activeAction.destructive ? 'destructive' : 'primary'}
                disabled={
                  actionReason.length < (activeAction.minReasonLength ?? 1) || isActionPending
                }
                onClick={() => executeAction(activeAction, actionReason)}
              >
                {isActionPending ? 'Processing...' : activeAction.label}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ---- Upload file dialog ---- */}
      {scoFolderId && (
        <UploadFileDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={scoFolderId}
          onSubmit={({ file, data }) => {
            uploadFileMutation.mutate(
              { file, data },
              {
                onSuccess: (uploaded) => {
                  addAttachmentMutation.mutate(
                    { scoId, data: { documentId: uploaded.id } },
                    { onSuccess: () => setUploadOpen(false) },
                  );
                },
              },
            );
          }}
          isSubmitting={uploadFileMutation.isPending || addAttachmentMutation.isPending}
        />
      )}
    </div>
  );
}

