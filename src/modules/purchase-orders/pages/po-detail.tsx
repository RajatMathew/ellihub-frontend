import { useState } from 'react';

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  ExternalLink,
  FileText,
  Link2,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Receipt,
  ShieldAlert,
  Trash2,
  Truck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@app/components/ui/field';
import { Input, InputWrapper } from '@app/components/ui/input';
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { Textarea } from '@app/components/ui/textarea';
import { formatCurrency, formatDate } from '@app/lib/helpers';
import { DetailSidebar } from '@modules/directory/components';
import { InfoRow } from '@modules/project/components/info-row';

import {
  PO_STATUS_BADGE_VARIANTS,
  PO_STATUS_COLORS,
  TRADE_CATEGORY_BADGE_VARIANTS,
  TRADE_CATEGORY_LABELS,
} from '../constants/po.constants';
import {
  useCancelPOMutation,
  useDeletePOMutation,
  useIssuePOMutation,
  usePODetailQuery,
  useRecordDeliveryMutation,
} from '../hooks/po.hooks';
import type { POStatusName } from '../schemas/po.schema';

/* ---- helpers ---- */

function calcOverdueDays(expectedDate: string | null | undefined): number {
  if (!expectedDate) return 0;
  const diff = Date.now() - new Date(expectedDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/* ---- Placeholder table component ---- */

function PlaceholderTable({
  title,
  icon,
  description,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="text-muted-foreground/40">{icon}</div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---- Detail field (label above, value below) ---- */

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
    <div className={className}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground">{children ?? '—'}</div>
    </div>
  );
}

/* ---- Page ---- */

export function PODetailPage() {
  const { projectId = '', poId = '' } = useParams<{ projectId: string; poId: string }>();
  const navigate = useNavigate();

  const { data: po, isLoading } = usePODetailQuery(poId);

  const issueMutation = useIssuePOMutation();
  const cancelMutation = useCancelPOMutation();
  const recordDeliveryMutation = useRecordDeliveryMutation();
  const deleteMutation = useDeletePOMutation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Record delivery dialog
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const statusName = (po?.status?.name ?? '') as POStatusName;
  const isDraft = statusName === 'DRAFT';
  const isIssued = statusName === 'ISSUED';
  const isPartiallyPaid = statusName === 'PARTIALLY_PAID';
  const isCancelled = statusName === 'CANCELLED';

  const canEdit = isDraft;
  const canIssue = isDraft;
  const canCancel = isDraft || isIssued;
  const canRecordDelivery = (isIssued || isPartiallyPaid) && !po?.deliveryDate;
  const canDelete = isDraft;

  const overdueDays = po?.isOverdue ? calcOverdueDays(po.expectedDate) : 0;

  const isActionPending =
    issueMutation.isPending ||
    cancelMutation.isPending ||
    recordDeliveryMutation.isPending ||
    deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <p className="text-sm text-muted-foreground">Loading purchase order...</p>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="container-fluid py-7.5">
        <p className="text-sm text-muted-foreground">Purchase order not found.</p>
      </div>
    );
  }

  const poTotal = parseFloat(po.total ?? '0');
  const totalCommitment = parseFloat(po.totalCommitment ?? '0');
  const scoTotal = totalCommitment - poTotal;
  const subtotal = parseFloat(po.subtotal ?? '0');
  const taxAmount = parseFloat(po.taxAmount ?? '0');
  const retainagePercent = parseFloat(po.retainagePercent ?? '0');

  return (
    <div className="container-fluid py-7.5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link
                to={`/app/project/${projectId}/purchase-orders`}
                className="hover:text-foreground"
              >
                Purchase Orders
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ToolbarPageTitle>
                {po.poNumber ?? 'Draft PO'}
              </ToolbarPageTitle>
              {po.status && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-2 rounded-full ${PO_STATUS_COLORS[statusName] ?? 'bg-muted-foreground'}`}
                  />
                  <span className="text-sm text-muted-foreground">{po.status.label}</span>
                </div>
              )}
              {po.tradeCategory && (
                <Badge
                  variant={TRADE_CATEGORY_BADGE_VARIANTS[po.tradeCategory] ?? 'primary'}
                  appearance="outline"
                  size="sm"
                >
                  {TRADE_CATEGORY_LABELS[po.tradeCategory]}
                </Badge>
              )}
              {po.isOverdue && (
                <Badge variant="destructive" size="sm">
                  <AlertTriangle className="size-3" />
                  Overdue
                </Badge>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            {canIssue && (
              <Button size="sm" onClick={() => setIssueOpen(true)}>
                <CheckCircle2 className="size-4" />
                Issue PO
              </Button>
            )}
            {canRecordDelivery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeliveryDate(new Date().toISOString().slice(0, 10));
                  setDeliveryNotes('');
                  setDeliveryOpen(true);
                }}
              >
                <Truck className="size-4" />
                Record Delivery
              </Button>
            )}
            {canEdit && (
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
              <DropdownMenuContent align="end" className="w-48">
                {canEdit && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                )}
                {canCancel && (
                  <DropdownMenuItem
                    onClick={() => {
                      setCancelReason('');
                      setCancelOpen(true);
                    }}
                  >
                    <XCircle className="size-4" />
                    Cancel PO
                  </DropdownMenuItem>
                )}
                {canDelete && (
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

      {/* ---- Overdue alert ---- */}
      {po.isOverdue && (
        <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="size-4 text-destructive" />
              <span className="text-xs font-semibold tracking-widest text-destructive uppercase">
                Purchase Alert
              </span>
            </div>
            <p className="text-sm font-semibold text-destructive">
              Purchase Order is Overdue
            </p>
            <p className="text-xs text-destructive/70 mt-0.5">
              Expected delivery was {po.expectedDate ? formatDate(po.expectedDate) : '—'}.
              Delivery has not been recorded.
            </p>
          </div>
          <div className="text-right shrink-0 pl-8">
            <div className="text-4xl font-bold text-destructive tabular-nums leading-none">
              {overdueDays}
            </div>
            <div className="text-xs text-destructive/70 mt-1">days overdue</div>
          </div>
        </div>
      )}

      {/* ---- Stat cards ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-5">
        <StatsCard
          icon={<DollarSign className="size-5 text-primary" />}
          bgClass="bg-primary/10"
          label="PO Total"
          value={formatCurrency(poTotal)}
          description="Base contract amount"
        />
        <StatsCard
          icon={<TrendingUp className="size-5 text-muted-foreground" />}
          bgClass="bg-muted/60"
          label="SCO Total"
          value={scoTotal > 0 ? `+${formatCurrency(scoTotal)}` : formatCurrency(0)}
          description="Approved change orders"
        />
        <StatsCard
          icon={<ClipboardList className="size-5 text-info" />}
          bgClass="bg-info/10"
          label="Total Commitment"
          value={formatCurrency(totalCommitment)}
          description="PO + approved SCOs"
        />
        <StatsCard
          icon={<CheckCircle2 className="size-5 text-success" />}
          bgClass="bg-success/10"
          label="Amount Paid"
          value={formatCurrency(0)}
          description="Via linked invoices"
        />
        <StatsCard
          icon={<Receipt className="size-5 text-warning" />}
          bgClass="bg-warning/10"
          label="Balance Due"
          value={formatCurrency(totalCommitment)}
          description="Remaining balance"
        />
      </div>

      {/* ---- Cancelled reason banner ---- */}
      {isCancelled && (po as { cancellationReason?: string | null }).cancellationReason && (
        <div className="mt-5 rounded-lg border border-muted bg-muted/30 px-5 py-4">
          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
            Cancellation Reason
          </div>
          <p className="text-sm text-foreground">
            {(po as { cancellationReason?: string | null }).cancellationReason}
          </p>
        </div>
      )}

      {/* ---- Main layout ---- */}
      <div className="flex gap-6 pt-5">
        {/* ---- Left + center content ---- */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Left column: Vendor info + Line items */}
            <div className="lg:col-span-3 space-y-5">
              {/* Vendor Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Vendor Information
                  </CardTitle>
                  {po.vendor?.id && (
                    <Link
                      to={`/app/directory/vendors/${po.vendor.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider"
                    >
                      View Profile
                      <ExternalLink className="size-3" />
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                    <DetailField label="Vendor">{po.vendor?.name}</DetailField>
                    <DetailField label="Contact">{po.contactName}</DetailField>
                    <DetailField label="Lead Time">{po.leadTime}</DetailField>
                    <DetailField label="Email">
                      {po.contactEmail ? (
                        <a
                          href={`mailto:${po.contactEmail}`}
                          className="text-primary hover:underline font-semibold"
                        >
                          {po.contactEmail}
                        </a>
                      ) : (
                        '—'
                      )}
                    </DetailField>
                    <DetailField label="Phone">{po.contactPhone}</DetailField>
                    <DetailField label="Payment Terms">
                      {po.paymentTerms?.replace(/_/g, ' ')}
                    </DetailField>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Details */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Additional Details
                  </CardTitle>
                  {canEdit && (
                    <Link
                      to="edit"
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider"
                    >
                      Edit
                      <Pencil className="size-3" />
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                    <DetailField label="Trade">
                      {po.tradeCategory ? TRADE_CATEGORY_LABELS[po.tradeCategory] : '—'}
                    </DetailField>
                    <DetailField label="Expected Date">
                      {po.expectedDate ? formatDate(po.expectedDate) : '—'}
                    </DetailField>
                    <DetailField label="Ship To" className="row-span-2">
                      {po.shipToAddress ?? '—'}
                    </DetailField>
                    <DetailField label="Issue Date">
                      {po.issueDate ? formatDate(po.issueDate) : '—'}
                    </DetailField>
                    <DetailField label="Delivery Date">
                      {po.deliveryDate ? formatDate(po.deliveryDate) : '—'}
                    </DetailField>
                    {(po.notes || po.vendorNotes) && (
                      <div className="col-span-3 pt-1">
                        <Separator className="mb-4" />
                        <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                          {po.notes && (
                            <DetailField label="Notes" className="col-span-3">
                              <span className="font-normal whitespace-pre-wrap">{po.notes}</span>
                            </DetailField>
                          )}
                          {po.vendorNotes && (
                            <DetailField label="Vendor Notes" className="col-span-3">
                              <span className="font-normal whitespace-pre-wrap">{po.vendorNotes}</span>
                            </DetailField>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Line Items ({po.lineItems?.length ?? 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {po.lineItems && po.lineItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 pr-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase w-8">
                              #
                            </th>
                            <th className="pb-2 pr-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                              Description
                            </th>
                            <th className="pb-2 pr-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">
                              Qty
                            </th>
                            <th className="pb-2 pr-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                              Unit
                            </th>
                            <th className="pb-2 pr-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">
                              Unit Price
                            </th>
                            <th className="pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.lineItems.map((li) => (
                            <tr key={li.id} className="border-b last:border-0">
                              <td className="py-2.5 pr-3 text-muted-foreground">
                                {li.lineNumber}
                              </td>
                              <td className="py-2.5 pr-3">
                                <div className="font-medium">{li.description}</div>
                                {li.notes && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {li.notes}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 pr-3 text-right tabular-nums">
                                {li.quantity}
                              </td>
                              <td className="py-2.5 pr-3">{li.unit}</td>
                              <td className="py-2.5 pr-3 text-right tabular-nums">
                                {formatCurrency(parseFloat(li.unitPrice ?? '0'))}
                              </td>
                              <td className="py-2.5 text-right font-medium tabular-nums">
                                {formatCurrency(parseFloat(li.amount ?? '0'))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          {taxAmount > 0 && (
                            <>
                              <tr>
                                <td colSpan={5} className="pt-3 text-right text-xs text-muted-foreground">
                                  Subtotal
                                </td>
                                <td className="pt-3 text-right tabular-nums text-sm">
                                  {formatCurrency(subtotal)}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  colSpan={5}
                                  className="pt-1 text-right text-xs text-muted-foreground"
                                >
                                  Tax ({po.taxPercent}%)
                                </td>
                                <td className="pt-1 text-right tabular-nums text-sm">
                                  {formatCurrency(taxAmount)}
                                </td>
                              </tr>
                            </>
                          )}
                          <tr>
                            <td
                              colSpan={5}
                              className="pt-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                            >
                              Total
                            </td>
                            <td className="pt-3 text-right font-semibold tabular-nums">
                              {formatCurrency(poTotal)}
                            </td>
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
            </div>

            {/* Right column: Placeholder sections */}
            <div className="lg:col-span-2 space-y-5">
              <PlaceholderTable
                title="PO Payment History"
                icon={<DollarSign className="size-8" />}
                description="Payment history will appear here once the payment module is implemented."
              />
              <PlaceholderTable
                title="Linked Invoices"
                icon={<Receipt className="size-8" />}
                description="Invoices linked to this purchase order will appear here."
              />
              <PlaceholderTable
                title="Change Orders"
                icon={<Link2 className="size-8" />}
                description="Vendor change orders (SCOs) linked to this PO will appear here."
              />
            </div>
          </div>
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
                  <InfoRow label="Subtotal">{formatCurrency(subtotal)}</InfoRow>
                  {taxAmount > 0 && (
                    <>
                      <InfoRow label={`Tax (${po.taxPercent}%)`}>
                        {formatCurrency(taxAmount)}
                      </InfoRow>
                    </>
                  )}
                  <InfoRow label="Total">{formatCurrency(poTotal)}</InfoRow>
                  {retainagePercent > 0 && (
                    <InfoRow label={`Retainage (${retainagePercent}%)`}>
                      {formatCurrency(poTotal * (retainagePercent / 100))}
                    </InfoRow>
                  )}
                  {scoTotal > 0 && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow label="SCO Total">+{formatCurrency(scoTotal)}</InfoRow>
                      <InfoRow label="Total Commitment">
                        {formatCurrency(totalCommitment)}
                      </InfoRow>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Key Dates */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Key Dates
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {po.issueDate && (
                    <div className="flex items-start gap-3">
                      <Calendar className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Issue Date</div>
                        <div className="text-sm font-medium">{formatDate(po.issueDate)}</div>
                      </div>
                    </div>
                  )}
                  {po.expectedDate && (
                    <div className="flex items-start gap-3">
                      <Calendar
                        className={`size-4 mt-0.5 shrink-0 ${po.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                      />
                      <div>
                        <div className="text-xs text-muted-foreground">Expected Delivery</div>
                        <div
                          className={`text-sm font-medium ${po.isOverdue ? 'text-destructive' : ''}`}
                        >
                          {formatDate(po.expectedDate)}
                          {po.isOverdue && (
                            <span className="ml-1.5 text-xs text-destructive">
                              ({overdueDays}d overdue)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {po.deliveryDate && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Delivered</div>
                        <div className="text-sm font-medium">
                          {formatDate(po.deliveryDate)}
                        </div>
                      </div>
                    </div>
                  )}
                  {po.createdAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="text-sm font-medium">{formatDate(po.createdAt)}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* PO Info */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                PO Details
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <InfoRow label="Payment Terms">
                    {po.paymentTerms?.replace(/_/g, ' ') ?? '—'}
                  </InfoRow>
                  {po.rfqId && (
                    <InfoRow label="Linked RFQ">{po.rfqId}</InfoRow>
                  )}
                  <InfoRow label="Revision">{`Rev. ${(po as { revisionNumber?: number }).revisionNumber ?? 1}`}</InfoRow>
                  <InfoRow label="Project">{po.project?.name ?? '—'}</InfoRow>
                </CardContent>
              </Card>
            </div>
          </div>
        </DetailSidebar>
      </div>

      {/* ---- Issue PO confirmation ---- */}
      <ConfirmDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        title="Issue Purchase Order"
        description={
          <>
            Issue <strong>{po.poNumber ?? 'this PO'}</strong> to{' '}
            <strong>{po.vendor?.name}</strong> for{' '}
            <strong>{formatCurrency(poTotal)}</strong>? This cannot be undone.
          </>
        }
        confirmLabel="Issue PO"
        onConfirm={() => {
          issueMutation.mutate(
            { id: poId },
            {
              onSuccess: (data) => {
                setIssueOpen(false);
                if ((data as { budgetWarning?: unknown }).budgetWarning) {
                  // Budget warning is non-blocking — handled by toast in mutation
                }
              },
            },
          );
        }}
        isPending={issueMutation.isPending}
      />

      {/* ---- Cancel dialog ---- */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCancelOpen(false);
            setCancelReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Provide a reason for cancelling{' '}
              <strong>{po.poNumber ?? 'this PO'}</strong>. This cannot be undone.
            </p>
            <Textarea
              placeholder="Reason for cancellation (min 20 characters)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
            />
            {cancelReason.length > 0 && cancelReason.length < 20 && (
              <p className="text-xs text-destructive">
                Reason must be at least 20 characters ({20 - cancelReason.length} more
                needed).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelOpen(false);
                setCancelReason('');
              }}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={cancelReason.length < 20 || isActionPending}
              onClick={() => {
                cancelMutation.mutate(
                  { id: poId, reason: cancelReason },
                  {
                    onSuccess: () => {
                      setCancelOpen(false);
                      setCancelReason('');
                    },
                  },
                );
              }}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel PO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Record delivery dialog ---- */}
      <Dialog
        open={deliveryOpen}
        onOpenChange={(open) => {
          if (!open) setDeliveryOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                Delivery Date
              </FieldLabel>
              <InputWrapper>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </InputWrapper>
            </Field>
            <Field>
              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                Notes (optional)
              </FieldLabel>
              <Textarea
                placeholder="Any notes about the delivery..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!deliveryDate || recordDeliveryMutation.isPending}
              onClick={() => {
                recordDeliveryMutation.mutate(
                  { id: poId, deliveryDate, notes: deliveryNotes || undefined },
                  { onSuccess: () => setDeliveryOpen(false) },
                );
              }}
            >
              {recordDeliveryMutation.isPending ? 'Saving...' : 'Record Delivery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmation ---- */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Purchase Order"
        description={
          <>
            This will permanently delete{' '}
            <strong>{po.poNumber ?? 'this PO'}</strong>. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          deleteMutation.mutate(poId, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
