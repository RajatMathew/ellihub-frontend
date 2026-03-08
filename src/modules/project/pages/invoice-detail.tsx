import { useState } from 'react';

import {
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '@app/components/ui/field';
import { Input, InputWrapper } from '@app/components/ui/input';
import { Checkbox } from '@app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Separator } from '@app/components/ui/separator';
import { Textarea } from '@app/components/ui/textarea';
import { formatCurrency, formatDate } from '@app/lib/helpers';

import { InfoRow } from '@modules/project/components/info-row';
import {
  INVOICE_STATUS_COLORS,
  PAYMENT_METHOD_OPTIONS,
} from '@modules/project/constants/invoice.constants';
import { DetailSidebar } from '@modules/directory/components';
import {
  useApproveInvoiceMutation,
  useDeleteInvoiceMutation,
  useDisputeInvoiceMutation,
  useInvoiceDetailQuery,
  useMarkPaidInvoiceMutation,
  useRejectInvoiceMutation,
  useResolveDisputeInvoiceMutation,
} from '../hooks';
import {
  invoiceMarkPaidInputSchema,
  type InvoiceMarkPaidInput,
} from '../schemas/invoice.schema';

/* ---- Page ---- */

export function InvoiceDetailPage() {
  const { invoiceId = '' } = useParams<{ projectId: string; invoiceId: string }>();
  const navigate = useNavigate();

  const { data: invoice, isLoading } = useInvoiceDetailQuery(invoiceId);

  const approveMutation = useApproveInvoiceMutation();
  const rejectMutation = useRejectInvoiceMutation();
  const markPaidMutation = useMarkPaidInvoiceMutation();
  const disputeMutation = useDisputeInvoiceMutation();
  const resolveDisputeMutation = useResolveDisputeInvoiceMutation();
  const deleteMutation = useDeleteInvoiceMutation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  // Reject dialog state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Mark paid dialog state
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const markPaidForm = useForm<InvoiceMarkPaidInput>({
    resolver: zodResolver(invoiceMarkPaidInputSchema),
    defaultValues: {
      paidAmount: 0,
      paidDate: new Date().toISOString().slice(0, 10),
      paymentMethod: undefined,
      paymentReference: '',
      notes: '',
    },
  });

  // Dispute dialog state
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeNotifyVendor, setDisputeNotifyVendor] = useState(false);

  // Resolve dispute dialog state
  const [resolveDisputeOpen, setResolveDisputeOpen] = useState(false);
  const [resolution, setResolution] = useState('');

  const statusName = invoice?.status?.name ?? '';
  const isPending = statusName === 'PENDING';
  const isApproved = statusName === 'APPROVED';
  const isPaid = invoice?.isPaid === true;
  const isRejected = statusName === 'REJECTED';
  const isDisputed = invoice?.isDisputed === true;

  const isActionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    markPaidMutation.isPending ||
    disputeMutation.isPending ||
    resolveDisputeMutation.isPending;

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

  return (
    <div className="container-fluid py-7.5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Invoices
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ToolbarPageTitle>
                {invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}
              </ToolbarPageTitle>
              {invoice.status && (
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${INVOICE_STATUS_COLORS[invoice.status.name] ?? 'bg-muted-foreground'}`} />
                  <span className="text-sm text-muted-foreground">{invoice.status.label}</span>
                </div>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            {/* Workflow actions */}
            {isPending && (
              <>
                <Button size="sm" onClick={() => setApproveOpen(true)}>
                  Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setRejectOpen(true); setRejectReason(''); }}>
                  Reject
                </Button>
              </>
            )}
            {isApproved && !isPaid && (
              <Button size="sm" onClick={() => {
                markPaidForm.reset({
                  paidAmount: invoice.totalAmount ?? 0,
                  paidDate: new Date().toISOString().slice(0, 10),
                  paymentMethod: undefined,
                  paymentReference: '',
                  notes: '',
                });
                setMarkPaidOpen(true);
              }}>
                <DollarSign className="size-4" />
                Mark as Paid
              </Button>
            )}
            {!isPaid && !isRejected && !isDisputed && (
              <Button variant="outline" size="sm" onClick={() => { setDisputeOpen(true); setDisputeReason(''); setDisputeNotifyVendor(false); }}>
                Dispute
              </Button>
            )}
            {isDisputed && (
              <Button size="sm" onClick={() => { setResolveDisputeOpen(true); setResolution(''); }}>
                Resolve Dispute
              </Button>
            )}

            {/* Edit + more menu */}
            {isPending && (
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
              <DropdownMenuContent align="end" className="w-52">
                {isPending && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                )}
                {isPending && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
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

      {/* ---- Main layout ---- */}
      <div className="flex gap-6 pt-5">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {invoice.invoiceNumber && <InfoRow label="Invoice #">{invoice.invoiceNumber}</InfoRow>}
              <InfoRow label="Vendor">{invoice.vendor?.name ?? '—'}</InfoRow>
              <InfoRow label="Invoice Date">{invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '—'}</InfoRow>
              <InfoRow label="Due Date">
                <span className={invoice.isPastDue ? 'text-destructive font-medium' : ''}>
                  {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                  {invoice.isPastDue && ` (${invoice.daysOverdue ?? 0} days overdue)`}
                </span>
              </InfoRow>
              <InfoRow label="Type">{invoice.invoiceType ?? '—'}</InfoRow>
              <InfoRow label="Category">{invoice.category ?? '—'}</InfoRow>
              {invoice.purchaseOrder && (
                <InfoRow label="Purchase Order">{invoice.purchaseOrder.poNumber}</InfoRow>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Line Items ({invoice.lineItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.lineItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">#</th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Description</th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">Qty</th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Unit</th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">Unit Price</th>
                        <th className="pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lineItems.map((li, idx) => (
                        <tr key={li.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-4 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 pr-4 font-medium">{li.description}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{li.qty}</td>
                          <td className="py-2.5 pr-4">{li.unit}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{formatCurrency(li.unitPrice)}</td>
                          <td className="py-2.5 text-right font-medium tabular-nums">{formatCurrency(li.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="pt-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">Total</td>
                        <td className="pt-3 text-right font-semibold tabular-nums">{formatCurrency(invoice.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No line items.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          {isPaid && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Paid Amount">{formatCurrency(invoice.paidAmount ?? 0)}</InfoRow>
                <InfoRow label="Paid Date">{invoice.paidDate ? formatDate(invoice.paidDate) : '—'}</InfoRow>
                <InfoRow label="Payment Method">{invoice.paymentMethod ?? '—'}</InfoRow>
                <InfoRow label="Payment Reference">{invoice.paymentReference ?? '—'}</InfoRow>
              </CardContent>
            </Card>
          )}

          {/* Dispute Info */}
          {(isDisputed || invoice.disputeReason) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Dispute Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Dispute Reason">{invoice.disputeReason ?? '—'}</InfoRow>
                {invoice.disputeDate && (
                  <InfoRow label="Dispute Date">{formatDate(invoice.disputeDate)}</InfoRow>
                )}
                {invoice.disputeResolution && (
                  <InfoRow label="Resolution">{invoice.disputeResolution}</InfoRow>
                )}
                {invoice.disputeResolvedDate && (
                  <InfoRow label="Resolved Date">{formatDate(invoice.disputeResolvedDate)}</InfoRow>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <div className="space-y-6 pt-2">
            {/* Financial Summary */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Financial Summary
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <InfoRow label="Total Amount">{formatCurrency(invoice.totalAmount)}</InfoRow>
                  <InfoRow label="Tax Amount">{formatCurrency(invoice.taxAmount ?? 0)}</InfoRow>
                  {invoice.taxRate != null && (
                    <InfoRow label="Tax Rate">{invoice.taxRate}%</InfoRow>
                  )}
                  {invoice.retainagePercent != null && invoice.retainagePercent > 0 && (
                    <>
                      <InfoRow label="Retainage">{invoice.retainagePercent}%</InfoRow>
                      <InfoRow label="Retainage Amount">{formatCurrency(invoice.retainageAmount ?? 0)}</InfoRow>
                    </>
                  )}
                  {invoice.netPaymentAmount != null && (
                    <InfoRow label="Net Payment">{formatCurrency(invoice.netPaymentAmount)}</InfoRow>
                  )}
                  {invoice.paidAmount != null && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow label="Paid">{formatCurrency(invoice.paidAmount)}</InfoRow>
                      <InfoRow label="Balance">{formatCurrency(invoice.totalAmount - (invoice.paidAmount ?? 0))}</InfoRow>
                    </>
                  )}
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
                  {invoice.createdAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="size-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="text-sm font-medium">{formatDate(invoice.createdAt)}</div>
                      </div>
                    </div>
                  )}
                  {invoice.approvedAt && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-4 text-success mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Approved</div>
                        <div className="text-sm font-medium">{formatDate(invoice.approvedAt)}</div>
                      </div>
                    </div>
                  )}
                  {invoice.rejectionReason && (
                    <div className="flex items-start gap-3">
                      <XCircle className="size-4 text-destructive mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Rejected</div>
                        <p className="text-xs text-muted-foreground mt-1">{invoice.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                  {invoice.paidDate && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="size-4 text-primary mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Paid</div>
                        <div className="text-sm font-medium">{formatDate(invoice.paidDate)}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DetailSidebar>
      </div>

      {/* ---- Approve confirmation ---- */}
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Invoice"
        description={
          <>
            Are you sure you want to approve{' '}
            <strong>{invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : 'this invoice'}</strong>
            {' '}for <strong>{formatCurrency(invoice.totalAmount)}</strong>?
          </>
        }
        confirmLabel="Approve"
        onConfirm={() => {
          approveMutation.mutate(invoiceId, {
            onSuccess: () => setApproveOpen(false),
          });
        }}
        isPending={approveMutation.isPending}
      />

      {/* ---- Reject dialog ---- */}
      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!open) { setRejectOpen(false); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting{' '}
              <strong>{invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : 'this invoice'}</strong>.
            </p>
            <Textarea
              placeholder="Reason (min 20 characters)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            {rejectReason.length > 0 && rejectReason.length < 20 && (
              <p className="text-xs text-destructive">
                Reason must be at least 20 characters ({20 - rejectReason.length} more needed).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectReason.length < 20 || isActionPending}
              onClick={() => {
                rejectMutation.mutate(
                  { id: invoiceId, data: { reason: rejectReason } },
                  { onSuccess: () => { setRejectOpen(false); setRejectReason(''); } },
                );
              }}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Mark Paid dialog ---- */}
      <Dialog open={markPaidOpen} onOpenChange={(open) => { if (!open) setMarkPaidOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={markPaidForm.handleSubmit((data) => {
              markPaidMutation.mutate(
                { id: invoiceId, data },
                { onSuccess: () => setMarkPaidOpen(false) },
              );
            })}
            className="space-y-4"
          >
            <Controller
              name="paidAmount"
              control={markPaidForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-xs font-semibold tracking-widest uppercase">Paid Amount</FieldLabel>
                  <InputWrapper>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                  </InputWrapper>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="paidDate"
              control={markPaidForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-xs font-semibold tracking-widest uppercase">Payment Date</FieldLabel>
                  <InputWrapper>
                    <Input type="date" {...field} aria-invalid={fieldState.invalid} />
                  </InputWrapper>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="paymentMethod"
              control={markPaidForm.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel className="text-xs font-semibold tracking-widest uppercase">Payment Method</FieldLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="paymentReference"
              control={markPaidForm.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel className="text-xs font-semibold tracking-widest uppercase">Payment Reference</FieldLabel>
                  <InputWrapper>
                    <Input {...field} placeholder="e.g. Check #1234" autoComplete="off" />
                  </InputWrapper>
                </Field>
              )}
            />
            <Controller
              name="notes"
              control={markPaidForm.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel className="text-xs font-semibold tracking-widest uppercase">Notes</FieldLabel>
                  <Textarea {...field} placeholder="Optional notes..." rows={3} />
                </Field>
              )}
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setMarkPaidOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={markPaidMutation.isPending}>
                {markPaidMutation.isPending ? 'Saving...' : 'Mark as Paid'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Dispute dialog ---- */}
      <Dialog open={disputeOpen} onOpenChange={(open) => { if (!open) setDisputeOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Describe the dispute reason..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-vendor"
                checked={disputeNotifyVendor}
                onCheckedChange={(v) => setDisputeNotifyVendor(v === true)}
              />
              <label htmlFor="notify-vendor" className="text-sm text-muted-foreground cursor-pointer">
                Notify vendor
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button
              disabled={!disputeReason || isActionPending}
              onClick={() => {
                disputeMutation.mutate(
                  { id: invoiceId, data: { disputeReason, notifyVendor: disputeNotifyVendor } },
                  { onSuccess: () => setDisputeOpen(false) },
                );
              }}
            >
              {disputeMutation.isPending ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Resolve Dispute dialog ---- */}
      <Dialog open={resolveDisputeOpen} onOpenChange={(open) => { if (!open) setResolveDisputeOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Describe the resolution..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDisputeOpen(false)}>Cancel</Button>
            <Button
              disabled={!resolution || isActionPending}
              onClick={() => {
                resolveDisputeMutation.mutate(
                  { id: invoiceId, data: { resolution } },
                  { onSuccess: () => setResolveDisputeOpen(false) },
                );
              }}
            >
              {resolveDisputeMutation.isPending ? 'Resolving...' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmation ---- */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Invoice"
        description={
          <>
            This will permanently delete{' '}
            <strong>{invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : 'this invoice'}</strong>. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          deleteMutation.mutate(invoiceId, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
