import { useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
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
import { toast } from 'sonner';

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
import { Field, FieldError, FieldLabel } from '@app/components/ui/field';
import { Input, InputWrapper } from '@app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { Textarea } from '@app/components/ui/textarea';
import { useBreadcrumbLabel } from '@app/hooks/use-breadcrumb-label';
import { formatCurrency, formatDate } from '@app/lib/helpers';
import { ActivityFeed, type ActivityItem } from '@core/ui/components/sections/activity-feed';
import { DetailSidebar } from '@modules/directory/components';
import { UploadFileDialog } from '@modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@modules/files/hooks/files.hooks';
import { InfoRow } from '@modules/project/components/info-row';
import { useLookupsQuery } from '@modules/project/hooks/lookup.hooks';
import { useProjectFolderQuery } from '@modules/project/hooks/use-project-folder';

import {
  useActivityLogQuery,
  useDisputeInvoiceMutation,
  useInvoiceDetailQuery,
  useMarkPaidInvoiceMutation,
  useMarkUnpaidInvoiceMutation,
  useResolveDisputeInvoiceMutation,
} from '../hooks';
import {
  useAddInvoiceAttachmentMutation,
  useRemoveInvoiceAttachmentMutation,
} from '../hooks/invoice-attachment.hooks';
import {
  invoiceMarkPaidInputSchema,
  type InvoiceMarkPaidInput,
} from '../schemas/invoice.schema';

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

export function InvoiceDetailPage() {
  const { projectId = '', invoiceId = '' } = useParams<{
    projectId: string;
    invoiceId: string;
  }>();

  const { data: invoice, isLoading } = useInvoiceDetailQuery(invoiceId);
  useBreadcrumbLabel(
    projectId && invoiceId ? `/app/project/${projectId}/invoices/${invoiceId}` : undefined,
    invoice?.invoiceNumber ?? undefined,
  );

  const { data: invoiceFolderId } = useProjectFolderQuery(projectId || undefined, 'invoice');
  const { data: paymentMethods } = useLookupsQuery('PAYMENT_METHOD');
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
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Invoice not found.</div>
      </div>
    );
  }

  const attachments = (invoice.attachments ?? []) as InvoiceAttachment[];
  const isPaid = invoice.isPaid === true;
  const isDisputed = invoice.isDisputed === true;
  const totalAmount = Number(invoice.totalAmount ?? 0);
  const taxAmount = Number(invoice.taxAmount ?? 0);
  const subtotal = Math.max(0, totalAmount - taxAmount);
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

  return (
    <div className="container-fluid max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7.5 lg:py-7.5">
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
              <Badge
                variant={isPaid ? 'success' : 'warning'}
                appearance="outline"
                size="sm"
              >
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
            {!isPaid && (
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
            {isPaid && (
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
            {!isDisputed && (
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
            {isDisputed && (
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
            {!isPaid && (
              <Button variant="outline" size="sm" asChild>
                <Link to="edit">
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" mode="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {!isPaid && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                )}
                {!isPaid && invoiceFolderId && (
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

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatsCard
          icon={<Receipt className="size-5 text-primary" />}
          bgClass="bg-primary/10"
          label="Invoice Total"
          value={money(totalAmount)}
          description="Submitted amount"
        />
        <StatsCard
          icon={<Receipt className="size-5 text-muted-foreground" />}
          bgClass="bg-muted/60"
          label="Subtotal"
          value={money(subtotal)}
          description="Before tax"
        />
        <StatsCard
          icon={<Receipt className="size-5 text-info" />}
          bgClass="bg-info/10"
          label="Tax"
          value={money(taxAmount)}
          description={`${invoice.taxRate ?? 0}%`}
        />
        <StatsCard
          icon={<CreditCard className="size-5 text-success" />}
          bgClass="bg-success/10"
          label="Payment"
          value={isPaid ? 'Paid' : 'Unpaid'}
          description={invoice.paidDate ? dateOrDash(invoice.paidDate) : 'No payment recorded'}
        />
        <StatsCard
          icon={<Calendar className="size-5 text-warning" />}
          bgClass="bg-warning/10"
          label="Due Date"
          value={dateOrDash(invoice.dueDate)}
          description={isPastDue ? 'Past due' : 'Payment due'}
        />
      </div>

      {isDisputed && invoice.disputeReason && (
        <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-destructive">
            <AlertTriangle className="size-4" />
            Dispute Reason
          </div>
          <p className="text-sm text-foreground">{invoice.disputeReason}</p>
        </div>
      )}

      <div className="flex flex-col gap-5 pt-5 xl:flex-row">
        <div className="min-w-0 flex-1">
          <div className="grid min-w-0 grid-cols-1 gap-5 min-[1800px]:grid-cols-5">
            <div className="min-w-0 space-y-5 min-[1800px]:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Invoice Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Invoice #">{invoice.invoiceNumber}</DetailField>
                    <DetailField label="Invoice Date">{dateOrDash(invoice.invoiceDate)}</DetailField>
                    <DetailField label="Due Date">{dateOrDash(invoice.dueDate)}</DetailField>
                    <DetailField label="Vendor">{invoice.vendor?.name ?? '-'}</DetailField>
                    <DetailField label="Project">{invoice.project?.name ?? '-'}</DetailField>
                    <DetailField label="Related SCOs">
                      {invoice.relatedSCOIds.length > 0
                        ? `${invoice.relatedSCOIds.length} linked`
                        : '-'}
                    </DetailField>
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

              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Documents ({attachments.length})
                  </CardTitle>
                  {!isPaid && invoiceFolderId && (
                    <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                      <Upload className="size-4" />
                      Upload
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map((attachment) => {
                        const document = attachment.document;
                        return (
                          <div
                            key={attachment.id}
                            className="flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <FileText className="size-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-medium">
                                  {document?.displayName ?? document?.name ?? 'Document'}
                                </span>
                                {fileSizeLabel(document?.size) && (
                                  <span className="text-xs text-muted-foreground">
                                    {fileSizeLabel(document?.size)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                              {document?.id && (
                                <Button
                                  variant="ghost"
                                  mode="icon"
                                  size="sm"
                                  onClick={() => downloadFile.mutate(document)}
                                >
                                  <Download className="size-3.5" />
                                </Button>
                              )}
                              {!isPaid && (
                                <Button
                                  variant="ghost"
                                  mode="icon"
                                  size="sm"
                                  disabled={attachments.length <= 1}
                                  onClick={() => {
                                    if (attachments.length <= 1) {
                                      toast.error('At least one attachment is required.');
                                      return;
                                    }
                                    removeAttachmentMutation.mutate({
                                      invoiceId,
                                      attachmentId: attachment.id,
                                    });
                                  }}
                                >
                                  <Trash2 className="size-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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

            <div className="min-w-0 space-y-5 min-[1800px]:col-span-2">
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
                    <DetailField label="PO Number">
                      {invoice.purchaseOrder?.poNumber ?? invoice.purchaseOrderId ?? '-'}
                    </DetailField>
                    <DetailField label="PO Status">
                      {invoice.purchaseOrder?.status ?? '-'}
                    </DetailField>
                    <DetailField label="PO Total">
                      {invoice.purchaseOrder?.total ? money(invoice.purchaseOrder.total) : '-'}
                    </DetailField>
                    <DetailField label="Payment Terms">
                      {invoice.purchaseOrder?.paymentTerms?.replace(/_/g, ' ') ?? '-'}
                    </DetailField>
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
                  {invoice.relatedSCOIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {invoice.relatedSCOIds.map((id) => (
                        <Badge key={id} variant="secondary" appearance="outline" size="sm">
                          {id}
                        </Badge>
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
                  <InfoRow label="Subtotal">{money(subtotal)}</InfoRow>
                  <InfoRow label={`Tax (${invoice.taxRate ?? 0}%)`}>
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
            onSubmit={markPaidForm.handleSubmit((values) => {
              markPaidMutation.mutate(
                {
                  id: invoiceId,
                  data: values,
                },
                { onSuccess: () => setMarkPaidOpen(false) },
              );
            })}
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(paymentMethods ?? []).map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.label ?? method.name ?? method.id}
                        </SelectItem>
                      ))}
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
                  { onSuccess: () => setDisputeOpen(false) },
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
            { onSuccess: () => setResolveOpen(false) },
          )
        }
        isPending={resolveDisputeMutation.isPending}
      />

      {invoiceFolderId && (
        <UploadFileDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={invoiceFolderId}
          onSubmit={({ file, data }) => {
            uploadFileMutation.mutate(
              { file, data },
              {
                onSuccess: (uploaded) => {
                  addAttachmentMutation.mutate(
                    { invoiceId, data: { documentId: uploaded.id } },
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
