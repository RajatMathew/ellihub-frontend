import { useMemo, useState } from 'react';

import { DetailSidebar } from '@/app/components/detail-sidebar';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { Textarea } from '@/app/components/ui/textarea';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { formatCurrency, formatDate, formatPercent } from '@/app/lib/helpers';
import { ActivityFeed, type ActivityItem } from '@/core/ui/components/sections/activity-feed';
import { useActivityLogQuery } from '@/modules/directory/hooks/activity.hooks';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@/modules/files/hooks/files.hooks';
import {
  InfoRow,
  ProjectDetailDocumentsCard,
  ProjectDetailField,
  ProjectDetailPageLoading,
} from '@/modules/project/components/shared';
import { getSubChangeOrderTotalAmount } from '@/modules/project/components/sub-change-order';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import {
  useAddInvoiceAttachmentMutation,
  useDisputeInvoiceMutation,
  useInvoiceDetailQuery,
  useMarkPaidInvoiceMutation,
  useMarkUnpaidInvoiceMutation,
  useRemoveInvoiceAttachmentMutation,
  useResolveDisputeInvoiceMutation,
} from '@/modules/project/hooks/invoice';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  useProjectEntityFolderQuery,
  useProjectFolderQuery,
} from '@/modules/project/hooks/use-project-folder';
import {
  invoiceMarkPaidInputSchema,
  type InvoiceMarkPaidInput,
} from '@/modules/project/schemas/invoice';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Receipt,
  RefreshCcw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

type InvoiceAttachment = {
  id: string;
  documentId?: string | null;
  document?: {
    id: string;
    name?: string | null;
    displayName?: string | null;
    mimeType?: string | null;
    size?: number | null;
  } | null;
};

function money(value: unknown) {
  const numeric = Number(value ?? 0);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
}

function dateOrDash(value: string | null | undefined) {
  return value ? formatDate(value) : '-';
}

function fileSizeLabel(value: number | null | undefined) {
  if (!value) return null;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / 1024).toFixed(1)} KB`;
}

function lookupLabel(value: unknown) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const label = record.label ?? record.name ?? record.type;
    return typeof label === 'string' ? label : null;
  }
  return null;
}

function relatedSCOBadgeVariant(status: string | null | undefined) {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
    case 'VOID':
      return 'destructive';
    case 'DRAFT':
    default:
      return 'secondary';
  }
}

export function InvoiceDetailPage() {
  const { projectId = '', invoiceId = '' } = useParams<{
    projectId: string;
    invoiceId: string;
  }>();

  const { data: invoice, isLoading } = useInvoiceDetailQuery(invoiceId);
  const { data: project } = useProjectDetailQuery(projectId);
  useBreadcrumbLabel(
    projectId && invoiceId ? `/app/project/${projectId}/invoices/${invoiceId}` : undefined,
    invoice?.invoiceNumber ?? undefined
  );

  const { data: invoiceFolderId } = useProjectFolderQuery(projectId || undefined, 'invoice');
  const { data: invoiceEntityFolderId } = useProjectEntityFolderQuery(
    projectId || undefined,
    'INVOICE',
    invoiceId || undefined,
    project?.capabilities?.actions?.invoice?.update === true
  );
  const invoiceUploadFolderId = invoiceEntityFolderId ?? invoiceFolderId;
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } =
    useLookupsQuery('PAYMENT_METHOD');
  const { data: activityData, isLoading: isActivityLoading } = useActivityLogQuery({
    entityType: 'invoice',
    entityId: invoiceId,
    size: 50,
  });

  const markPaidMutation = useMarkPaidInvoiceMutation();
  const markUnpaidMutation = useMarkUnpaidInvoiceMutation();
  const disputeMutation = useDisputeInvoiceMutation();
  const resolveDisputeMutation = useResolveDisputeInvoiceMutation();
  const addAttachmentMutation = useAddInvoiceAttachmentMutation();
  const removeAttachmentMutation = useRemoveInvoiceAttachmentMutation();
  const uploadFileMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markUnpaidOpen, setMarkUnpaidOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);

  const markPaidForm = useForm<InvoiceMarkPaidInput>({
    resolver: zodResolver(invoiceMarkPaidInputSchema),
    defaultValues: {
      paidDate: new Date().toISOString().slice(0, 10),
      paymentMethodId: '',
      paymentReference: '',
      paymentNotes: '',
    },
  });

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!activityData?.data) return [];
    return activityData.data.map((log) => {
      const action = log.action.toLowerCase();
      let icon = <Receipt className="size-4" />;
      let color = 'border-muted-foreground/20 bg-muted/30';

      if (action.includes('create')) {
        icon = <Receipt className="size-4 text-primary" />;
        color = 'border-primary/20 bg-primary/5';
      } else if (action.includes('paid') || action.includes('resolve')) {
        icon = <CheckCircle2 className="size-4 text-success" />;
        color = 'border-success/20 bg-success/5';
      } else if (action.includes('dispute')) {
        icon = <AlertTriangle className="size-4 text-warning" />;
        color = 'border-warning/20 bg-warning/5';
      } else if (action.includes('remove') || action.includes('delete')) {
        icon = <Trash2 className="size-4 text-destructive" />;
        color = 'border-destructive/20 bg-destructive/5';
      }

      return {
        id: log.id,
        user: log.user?.name || 'System',
        action: log.description,
        timestamp: log.createdAt
          ? new Date(log.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
        avatar: log.user?.image || undefined,
        icon,
        color,
      };
    });
  }, [activityData]);

  if (isLoading) {
    return <ProjectDetailPageLoading />;
  }

  if (!invoice) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Invoice not found.</div>
      </div>
    );
  }

  const attachments = (invoice.attachments ?? []) as InvoiceAttachment[];
  const relatedSCOs = invoice.relatedSCOs ?? [];
  const relatedSCOCount = relatedSCOs.length || invoice.relatedSCOIds.length;
  const isPaid = invoice.isPaid === true;
  const isDisputed = invoice.isDisputed === true;
  const projectActions = project?.capabilities?.actions;
  const canMarkInvoicePaid = projectActions?.invoice?.['mark-paid'] === true;
  const canMarkInvoiceUnpaid = projectActions?.invoice?.['mark-unpaid'] === true;
  const canDisputeInvoice = projectActions?.invoice?.dispute === true;
  const canResolveInvoiceDispute = projectActions?.invoice?.['resolve-dispute'] === true;
  const canEditInvoice = projectActions?.invoice?.update === true && !isPaid;
  const canUploadInvoiceAttachment = projectActions?.invoice?.update === true;
  const invoiceAmount = Number(invoice.totalAmount ?? 0);
  const taxAmount = Number(invoice.taxAmount ?? 0);
  const totalAmount = invoiceAmount + taxAmount;
  const isPastDue = !isPaid && !!invoice.dueDate && new Date(invoice.dueDate) < new Date();
  const paymentMethodLabel =
    invoice.paymentMethod?.label ??
    invoice.paymentMethod?.name ??
    paymentMethods?.find((method) => method.id === invoice.paymentMethodId)?.label ??
    paymentMethods?.find((method) => method.id === invoice.paymentMethodId)?.name ??
    '-';
  const isActionPending =
    markPaidMutation.isPending ||
    markUnpaidMutation.isPending ||
    disputeMutation.isPending ||
    resolveDisputeMutation.isPending;
  const hasPaymentMethods = (paymentMethods?.length ?? 0) > 0;

  return (
    <div className="container-fluid max-w-full overflow-x-hidden px-4 pb-5 sm:px-6 lg:px-7.5">
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Invoices
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToolbarPageTitle>{invoice.invoiceNumber ?? 'Invoice'}</ToolbarPageTitle>
              <Badge variant={isPaid ? 'success' : 'warning'} appearance="outline" size="sm">
                {isPaid ? 'Paid' : 'Unpaid'}
              </Badge>
              {isDisputed && (
                <Badge variant="destructive" appearance="outline" size="sm">
                  Disputed
                </Badge>
              )}
              {isPastDue && (
                <Badge variant="destructive" appearance="outline" size="sm">
                  Past Due
                </Badge>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            {canMarkInvoicePaid && !isPaid && (
              <Button
                size="sm"
                disabled={isActionPending}
                onClick={() => {
                  markPaidForm.reset({
                    paidDate: new Date().toISOString().slice(0, 10),
                    paymentMethodId: '',
                    paymentReference: '',
                    paymentNotes: '',
                  });
                  setMarkPaidOpen(true);
                }}
              >
                <CheckCircle2 className="size-4" />
                Mark Paid
              </Button>
            )}
            {canMarkInvoiceUnpaid && isPaid && (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionPending}
                onClick={() => setMarkUnpaidOpen(true)}
              >
                <RefreshCcw className="size-4" />
                Mark Unpaid
              </Button>
            )}
            {canDisputeInvoice && !isDisputed && (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionPending}
                onClick={() => {
                  setDisputeReason('');
                  setDisputeOpen(true);
                }}
              >
                <AlertTriangle className="size-4" />
                Dispute
              </Button>
            )}
            {canResolveInvoiceDispute && isDisputed && (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionPending}
                onClick={() => setResolveOpen(true)}
              >
                <XCircle className="size-4" />
                Resolve Dispute
              </Button>
            )}
            {canEditInvoice && (
              <Button variant="outline" size="sm" asChild>
                <Link to="edit">
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" mode="icon" aria-label="Invoice actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canEditInvoice && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                )}
                {canEditInvoice && invoiceUploadFolderId && (
                  <DropdownMenuItem onClick={() => setUploadOpen(true)}>
                    <Upload className="size-4" />
                    Upload Document
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
          <StatsBar variant="cards" width="full" columns={{ sm: 2, xl: 3, '2xl': 5 }}>
            <StatsBarItem
              variant="card"
              label="Invoice Amount"
              value={money(invoiceAmount)}
              description="Before tax"
              dotColor="bg-primary"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Tax"
              value={money(taxAmount)}
              description={formatPercent(invoice.taxRate)}
              dotColor="bg-info"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Total"
              value={money(totalAmount)}
              description="Amount + tax"
              dotColor="bg-label-lighter"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Payment"
              value={isPaid ? 'Paid' : 'Unpaid'}
              description={invoice.paidDate ? dateOrDash(invoice.paidDate) : 'No payment recorded'}
              dotColor={isPaid ? 'bg-success' : 'bg-warning'}
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Due Date"
              value={dateOrDash(invoice.dueDate)}
              description={isPastDue ? 'Past due' : 'Payment due'}
              dotColor={isPastDue ? 'bg-destructive' : 'bg-warning'}
              valueColor="text-foreground"
            />
          </StatsBar>

          {isDisputed && invoice.disputeReason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-destructive">
                <AlertTriangle className="size-4" />
                Dispute Reason
              </div>
              <p className="text-sm text-foreground">{invoice.disputeReason}</p>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-5">
            <div className="min-w-0 space-y-5 2xl:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Invoice Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <ProjectDetailField label="Invoice #">
                      {invoice.invoiceNumber}
                    </ProjectDetailField>
                    <ProjectDetailField label="Invoice Date">
                      {dateOrDash(invoice.invoiceDate)}
                    </ProjectDetailField>
                    <ProjectDetailField label="Due Date">
                      {dateOrDash(invoice.dueDate)}
                    </ProjectDetailField>
                    <ProjectDetailField label="Vendor">
                      {invoice.vendor?.name ?? '-'}
                    </ProjectDetailField>
                    <ProjectDetailField label="Project">
                      {invoice.project?.name ?? '-'}
                    </ProjectDetailField>
                    <ProjectDetailField label="Related SCOs">
                      {relatedSCOCount > 0 ? `${relatedSCOCount} linked` : '-'}
                    </ProjectDetailField>
                  </div>
                </CardContent>
              </Card>

              {invoice.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{invoice.notes}</p>
                  </CardContent>
                </Card>
              )}

              <ProjectDetailDocumentsCard
                documents={attachments}
                canUpload={canUploadInvoiceAttachment && !!invoiceUploadFolderId}
                canRemove={canEditInvoice}
                onUpload={() => setUploadOpen(true)}
                onDownload={(document) => downloadFile.mutate(document)}
                onRemove={(attachment) =>
                  removeAttachmentMutation.mutate({
                    invoiceId,
                    attachmentId: attachment.id,
                  })
                }
                getDescription={(attachment) =>
                  fileSizeLabel(attachment.document?.size) ?? undefined
                }
                isRemoveDisabled={() => attachments.length <= 1}
                getRemoveDisabledReason={() => 'At least one attachment is required.'}
              />
            </div>

            <div className="min-w-0 space-y-5 2xl:col-span-2">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Purchase Order
                  </CardTitle>
                  {invoice.purchaseOrder?.id && (
                    <Link
                      to={`/app/project/${projectId}/purchase-orders/${invoice.purchaseOrder.id}`}
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      View PO
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-1">
                    <ProjectDetailField label="PO Number">
                      {invoice.purchaseOrder?.poNumber ?? invoice.purchaseOrderId ?? '-'}
                    </ProjectDetailField>
                    <ProjectDetailField label="PO Status">
                      {invoice.purchaseOrder?.status ?? '-'}
                    </ProjectDetailField>
                    <ProjectDetailField label="PO Total">
                      {invoice.purchaseOrder?.total ? money(invoice.purchaseOrder.total) : '-'}
                    </ProjectDetailField>
                    <ProjectDetailField label="Payment Terms">
                      {invoice.purchaseOrder?.paymentTerms?.replace(/_/g, ' ') ?? '-'}
                    </ProjectDetailField>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Related SCOs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {relatedSCOs.length > 0 ? (
                    <div className="space-y-2">
                      {relatedSCOs.map((sco) => {
                        const changeTypeLabel = lookupLabel(sco.changeType);

                        return (
                          <Link
                            key={sco.id}
                            to={`/app/project/${projectId}/sub-change-order/${sco.id}`}
                            className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                          >
                            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="break-words text-sm font-semibold text-foreground">
                                    {sco.scoNumber ?? 'Sub Change Order'}
                                  </span>
                                  {sco.status && (
                                    <Badge
                                      variant={relatedSCOBadgeVariant(sco.status)}
                                      appearance="outline"
                                      size="sm"
                                    >
                                      {sco.status}
                                    </Badge>
                                  )}
                                </div>
                                {sco.title && (
                                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {sco.title}
                                  </div>
                                )}
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  {sco.date && <span>{formatDate(sco.date)}</span>}
                                  {changeTypeLabel && <span>{changeTypeLabel}</span>}
                                  <span>{sco.lineItems.length} line items</span>
                                  <span>{sco.attachments.length} attachments</span>
                                </div>
                              </div>
                              <div className="shrink-0 text-left sm:text-right">
                                <div className="text-sm font-semibold tabular-nums text-foreground">
                                  {money(getSubChangeOrderTotalAmount(sco))}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : invoice.relatedSCOIds.length > 0 ? (
                    <div className="space-y-2">
                      {invoice.relatedSCOIds.map((id) => (
                        <div key={id} className="rounded-lg border p-3">
                          <div className="text-sm font-semibold text-foreground">Related SCO</div>
                          <div className="mt-1 break-all text-xs text-muted-foreground">{id}</div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Details unavailable in this response.
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No related SCOs.</p>
                  )}
                </CardContent>
              </Card>

              {isPaid && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <InfoRow label="Paid Date">{dateOrDash(invoice.paidDate)}</InfoRow>
                    <InfoRow label="Payment Method">{paymentMethodLabel}</InfoRow>
                    <InfoRow label="Reference">{invoice.paymentReference ?? '-'}</InfoRow>
                    <InfoRow label="Notes">{invoice.paymentNotes ?? '-'}</InfoRow>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <DetailSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activityChildren={
            <div className="p-4">
              {isActivityLoading ? (
                <div className="py-6 text-center text-sm uppercase tracking-widest text-muted-foreground">
                  Loading activity...
                </div>
              ) : activityItems.length > 0 ? (
                <ActivityFeed items={activityItems} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Receipt className="size-8 text-muted-foreground/40" />
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    No activity recorded yet.
                  </p>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-6 pt-2">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Financial Summary
              </div>
              <Card>
                <CardContent className="space-y-1 p-4">
                  <InfoRow label="Invoice Amount">{money(invoiceAmount)}</InfoRow>
                  <InfoRow label={`Tax (${formatPercent(invoice.taxRate)})`}>
                    {money(taxAmount)}
                  </InfoRow>
                  <Separator className="my-2" />
                  <InfoRow label="Total">
                    <span className="font-semibold">{money(totalAmount)}</span>
                  </InfoRow>
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Timeline
              </div>
              <Card>
                <CardContent className="space-y-3 p-4">
                  {invoice.createdAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 size-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="text-sm font-medium">{formatDate(invoice.createdAt)}</div>
                      </div>
                    </div>
                  )}
                  {invoice.paidDate && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-4 text-success" />
                      <div>
                        <div className="text-xs text-muted-foreground">Paid</div>
                        <div className="text-sm font-medium">{formatDate(invoice.paidDate)}</div>
                      </div>
                    </div>
                  )}
                  {invoice.disputedAt && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-4 text-warning" />
                      <div>
                        <div className="text-xs text-muted-foreground">Disputed</div>
                        <div className="text-sm font-medium">{formatDate(invoice.disputedAt)}</div>
                      </div>
                    </div>
                  )}
                  {invoice.resolvedAt && (
                    <div className="flex items-start gap-3">
                      <XCircle className="mt-0.5 size-4 text-success" />
                      <div>
                        <div className="text-xs text-muted-foreground">Resolved</div>
                        <div className="text-sm font-medium">{formatDate(invoice.resolvedAt)}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DetailSidebar>
      </div>

      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice Paid</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void markPaidForm.handleSubmit((values) => {
                markPaidMutation.mutate(
                  {
                    id: invoiceId,
                    data: values,
                  },
                  { onSuccess: () => setMarkPaidOpen(false) }
                );
              }, onInvalidFormSubmit)(event)
            }
          >
            <Controller
              name="paidDate"
              control={markPaidForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Paid Date</FieldLabel>
                  <InputWrapper>
                    <Input type="date" {...field} />
                  </InputWrapper>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="paymentMethodId"
              control={markPaidForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Payment Method</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoadingPaymentMethods || markPaidMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method..." />
                    </SelectTrigger>
                    <SelectContent>
                      {hasPaymentMethods ? (
                        paymentMethods?.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.label ?? method.name ?? method.id}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__payment_methods_empty" disabled>
                          {isLoadingPaymentMethods
                            ? 'Loading payment methods...'
                            : 'No payment methods available'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="paymentReference"
              control={markPaidForm.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Payment Reference</FieldLabel>
                  <InputWrapper>
                    <Input {...field} placeholder="Check, ACH, or wire reference" />
                  </InputWrapper>
                </Field>
              )}
            />
            <Controller
              name="paymentNotes"
              control={markPaidForm.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Payment Notes</FieldLabel>
                  <Textarea {...field} rows={3} placeholder="Optional payment notes..." />
                </Field>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMarkPaidOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={markPaidMutation.isPending || !hasPaymentMethods}>
                Mark Paid
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={markUnpaidOpen}
        onOpenChange={setMarkUnpaidOpen}
        title="Mark Invoice Unpaid"
        description="This will clear payment date, method, reference, and notes."
        confirmLabel="Mark Unpaid"
        onConfirm={() =>
          markUnpaidMutation.mutate(invoiceId, {
            onSuccess: () => setMarkUnpaidOpen(false),
          })
        }
        isPending={markUnpaidMutation.isPending}
      />

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>Dispute Reason</FieldLabel>
              <Textarea
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                rows={4}
                placeholder="Explain why this invoice is disputed..."
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={disputeReason.trim().length === 0 || disputeMutation.isPending}
              onClick={() =>
                disputeMutation.mutate(
                  { id: invoiceId, data: { disputeReason: disputeReason.trim() } },
                  { onSuccess: () => setDisputeOpen(false) }
                )
              }
            >
              Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        title="Resolve Dispute"
        description="This will mark the invoice dispute as resolved."
        confirmLabel="Resolve"
        onConfirm={() =>
          resolveDisputeMutation.mutate(
            { id: invoiceId, data: { resolution: 'Resolved' } },
            { onSuccess: () => setResolveOpen(false) }
          )
        }
        isPending={resolveDisputeMutation.isPending}
      />

      {canUploadInvoiceAttachment && invoiceUploadFolderId && (
        <UploadFileDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={invoiceUploadFolderId}
          onSubmit={({ file, data }) => {
            uploadFileMutation.mutate(
              { file, data },
              {
                onSuccess: (uploaded) => {
                  addAttachmentMutation.mutate(
                    { invoiceId, data: { documentId: uploaded.id } },
                    { onSuccess: () => setUploadOpen(false) }
                  );
                },
              }
            );
          }}
          isSubmitting={uploadFileMutation.isPending || addAttachmentMutation.isPending}
        />
      )}
    </div>
  );
}
