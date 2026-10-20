import { useState } from 'react';

import { DetailSidebar } from '@/app/components/detail-sidebar';
import { importedBadges, ImportSourcePanel } from '@/app/components/import-source';
import { DetailPageHeader } from '@/app/components/page-header';
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
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { Textarea } from '@/app/components/ui/textarea';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { useResponsiveDetailSidebar } from '@/app/hooks/use-responsive-detail-sidebar';
import { formatDateOnly, isBeforeBusinessToday, todayDateOnly } from '@/app/lib/dates';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { formatCurrency, formatDate, formatPercent } from '@/app/lib/helpers';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useDownloadFile } from '@/modules/files/hooks/files.hooks';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import {
  InfoRow,
  ProjectActivityPanel,
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
  Pencil,
  RefreshCcw,
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
  return formatDateOnly(value, undefined, '-');
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

  const markPaidMutation = useMarkPaidInvoiceMutation();
  const markUnpaidMutation = useMarkUnpaidInvoiceMutation();
  const disputeMutation = useDisputeInvoiceMutation();
  const resolveDisputeMutation = useResolveDisputeInvoiceMutation();
  const addAttachmentMutation = useAddInvoiceAttachmentMutation();
  const removeAttachmentMutation = useRemoveInvoiceAttachmentMutation();
  const uploadManager = useUploadManager();
  const downloadFile = useDownloadFile();

  const [sidebarOpen, setSidebarOpen] = useResponsiveDetailSidebar();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markUnpaidOpen, setMarkUnpaidOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);

  const markPaidForm = useForm<InvoiceMarkPaidInput>({
    resolver: zodResolver(invoiceMarkPaidInputSchema),
    defaultValues: {
      paidDate: todayDateOnly(),
    },
  });

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
  const canEditInvoice = projectActions?.invoice?.update === true;
  const canUploadInvoiceAttachment = projectActions?.invoice?.update === true;
  const invoiceAmount = Number(invoice.totalAmount ?? 0);
  const taxAmount = Number(invoice.taxAmount ?? 0);
  const totalAmount = invoiceAmount + taxAmount;
  // The API decides on the business calendar; the fallback applies the same rule.
  const isPastDue = invoice.isPastDue ?? (!isPaid && isBeforeBusinessToday(invoice.dueDate));
  const isActionPending =
    markPaidMutation.isPending ||
    markUnpaidMutation.isPending ||
    disputeMutation.isPending ||
    resolveDisputeMutation.isPending;

  return (
    <div className="container-fluid max-w-full overflow-x-clip pb-5">
      <DetailPageHeader
        title={invoice.invoiceNumber ?? 'Invoice'}
        // Paid/Unpaid is the invoice's lifecycle state; disputed and past due
        // are flags that can qualify either of them.
        status={{ value: isPaid ? 'PAID' : 'UNPAID', tones: { UNPAID: 'caution' } }}
        badges={[
          ...(isDisputed ? [{ label: 'Disputed', variant: 'destructive' as const }] : []),
          ...(isPastDue ? [{ label: 'Past Due', variant: 'destructive' as const }] : []),
          ...importedBadges(invoice.importSource),
        ]}
        actions={[
          {
            label: 'Mark Paid',
            icon: CheckCircle2,
            placement: 'primary',
            disabled: isActionPending,
            enabled: [canMarkInvoicePaid, !isPaid],
            onClick: () => {
              markPaidForm.reset({ paidDate: todayDateOnly() });
              setMarkPaidOpen(true);
            },
          },
          {
            label: 'Mark Unpaid',
            icon: RefreshCcw,
            disabled: isActionPending,
            enabled: [canMarkInvoiceUnpaid, isPaid],
            onClick: () => setMarkUnpaidOpen(true),
          },
          {
            label: 'Dispute',
            icon: AlertTriangle,
            disabled: isActionPending,
            enabled: [canDisputeInvoice, !isDisputed],
            onClick: () => {
              setDisputeReason('');
              setDisputeOpen(true);
            },
          },
          {
            label: 'Resolve Dispute',
            icon: XCircle,
            disabled: isActionPending,
            enabled: [canResolveInvoiceDispute, isDisputed],
            onClick: () => setResolveOpen(true),
          },
          { label: 'Edit', icon: Pencil, to: 'edit', enabled: canEditInvoice },
          {
            label: 'Upload Document',
            icon: Upload,
            placement: 'overflow',
            enabled: [canEditInvoice, Boolean(invoiceUploadFolderId)],
            onClick: () => setUploadOpen(true),
          },
        ]}
        panel={{ open: sidebarOpen, onOpen: () => setSidebarOpen(true), label: 'Details' }}
      />

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
              label="Paid Status"
              value={isPaid ? 'Paid' : 'Unpaid'}
              description={
                invoice.paidDate ? dateOrDash(invoice.paidDate) : 'No paid date recorded'
              }
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
            <div className="relative flex flex-col gap-4 rounded-xl border border-border border-s-4 border-s-destructive bg-destructive-soft p-5 shadow-xs shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-destructive shadow-xs border border-border">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                      Invoice Alert
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Dispute Reason</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {invoice.disputeReason}
                  </p>
                </div>
              </div>
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
                    <ProjectDetailField label="External Invoice #">
                      {invoice.externalInvoiceNumber || '-'}
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
                    <ProjectDetailField label="Vendor Coupon">
                      {invoice.vendorCoupon ? 'Yes' : 'No'}
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
                isRemoveDisabled={() => !invoice.vendorCoupon && attachments.length <= 1}
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
                                  {sco.date && <span>{formatDateOnly(sco.date)}</span>}
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
                      Paid Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <InfoRow label="Paid Date">{dateOrDash(invoice.paidDate)}</InfoRow>
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
            <ProjectActivityPanel
              entityType="invoice"
              entityId={invoiceId}
              emptyMessage="No activity recorded yet."
            />
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
                        <div className="text-sm font-medium">
                          {formatDateOnly(invoice.paidDate)}
                        </div>
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
            {invoice.importSource ? <ImportSourcePanel source={invoice.importSource} /> : null}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMarkPaidOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={markPaidMutation.isPending}>
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
        description="This will clear the paid date and mark the invoice as unpaid."
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
          onSubmit={(payload) => {
            uploadManager.enqueueUpload(payload, {
              label: 'Invoice attachment',
              onUploaded: async (uploaded) => {
                await addAttachmentMutation.mutateAsync({
                  invoiceId,
                  data: { documentId: uploaded.id },
                });
              },
            });
            setUploadOpen(false);
          }}
          isSubmitting={false}
        />
      )}
    </div>
  );
}
