import { useState } from 'react';

import {
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  ShieldAlert,
  Trash2,
  Upload,
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
import { Separator } from '@app/components/ui/separator';
import { Textarea } from '@app/components/ui/textarea';
import { formatCurrency, formatDate } from '@app/lib/helpers';

import { UploadFileDialog } from '@modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@modules/files/hooks/files.hooks';
import { useCostCodesQuery } from '@modules/catalog/hooks';
import { DetailSidebar } from '@modules/directory/components';
import { InfoRow } from '@modules/project/components/info-row';
import { useProjectFolderQuery } from '@modules/project/hooks/use-project-folder';
import { useAddSCOAttachmentMutation, useRemoveSCOAttachmentMutation } from '@modules/sco/hooks/sco-attachment.hooks';
import {
  INITIATED_BY_LABELS,
  PRIORITY_LABELS,
  SCO_STATUS_COLORS,
  getSCOPriorityVariant,
} from '@modules/sco/constants/sco.constants';
import {
  useApproveSCOMutation,
  useDeleteSCOMutation,
  useRejectSCOMutation,
  useRevertSCOToDraftMutation,
  useSCODetailQuery,
  useVoidSCOMutation,
} from '@modules/sco/hooks/sco.hooks';

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
    { label: 'Reject', endpoint: 'reject', needsReason: true, minReasonLength: 20, destructive: true },
    { label: 'Void', endpoint: 'void', needsReason: true, destructive: true },
  ],
  APPROVED: [
    { label: 'Void', endpoint: 'void', needsReason: true, destructive: true },
  ],
  // REJECTED and VOID are terminal — no actions
};

/* ---- Page ---- */

export function SCODetailPage() {
  const { projectId = '', scoId = '' } = useParams<{ projectId: string; scoId: string }>();
  const navigate = useNavigate();

  const { data: sco, isLoading } = useSCODetailQuery(scoId);
  const { data: costCodesData } = useCostCodesQuery();
  const { data: scoFolderId } = useProjectFolderQuery(projectId || undefined, 'purchase order co');

  const approveMutation = useApproveSCOMutation();
  const rejectMutation = useRejectSCOMutation();
  const voidMutation = useVoidSCOMutation();
  const revertToDraftMutation = useRevertSCOToDraftMutation();
  const deleteMutation = useDeleteSCOMutation();
  const addAttachmentMutation = useAddSCOAttachmentMutation();
  const removeAttachmentMutation = useRemoveSCOAttachmentMutation();
  const uploadFileMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

  const costCodeMap = new Map(
    (costCodesData?.data ?? []).map((cc) => [cc.id, `${cc.code} - ${cc.name}`]),
  );
  const attachments = (sco?.attachments ?? []) as { id: string; documentId?: string; document?: { id: string; name: string } }[];

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Workflow dialog state
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);
  const [actionReason, setActionReason] = useState('');

  const statusName = sco?.status?.name ?? '';
  const isDraft = statusName === 'DRAFT';
  const isApproved = statusName === 'APPROVED';

  const canApprove = isDraft;
  const canReject = isDraft;
  const canVoid = isDraft || isApproved;
  const canRevert = isApproved;
  const canEdit = isDraft;
  const canDelete = isDraft;


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

  return (
    <div className="container-fluid py-7.5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Subcontractor Change Orders
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ToolbarPageTitle>
                {sco.scoNumber ? `SCO ${sco.scoNumber}` : sco.title}
              </ToolbarPageTitle>
              {sco.status && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-2 rounded-full ${SCO_STATUS_COLORS[sco.status.name] ?? 'bg-muted-foreground'}`}
                  />
                  <span className="text-sm text-muted-foreground">{sco.status.label}</span>
                </div>
              )}
              {sco.priority && (
                <Badge
                  variant={getSCOPriorityVariant(sco.priority)}
                  appearance="outline"
                  size="sm"
                >
                  {PRIORITY_LABELS[sco.priority] ?? sco.priority}
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
            {canRevert && (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionPending}
                onClick={() => revertToDraftMutation.mutate(scoId)}
              >
                Revert to Draft
              </Button>
            )}

            {/* Void — on APPROVED */}
            {canVoid && !isDraft && (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionPending}
                onClick={() => handleActionClick({ label: 'Void', endpoint: 'void', needsReason: true, destructive: true })}
              >
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
              <DropdownMenuContent align="end" className="w-52">
                {canEdit && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                )}
                {canReject && (
                  <DropdownMenuItem
                    onClick={() => handleActionClick({ label: 'Reject', endpoint: 'reject', needsReason: true, minReasonLength: 20, destructive: true })}
                  >
                    Reject
                  </DropdownMenuItem>
                )}
                {canVoid && isDraft && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleActionClick({ label: 'Void', endpoint: 'void', needsReason: true, destructive: true })}
                  >
                    Void
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

      {/* ---- Main layout ---- */}
      <div className="flex gap-6 pt-5">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* General Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Change Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {sco.scoNumber && <InfoRow label="SCO #">{sco.scoNumber}</InfoRow>}
              <InfoRow label="Title">{sco.title}</InfoRow>
              <InfoRow label="Date">{sco.date ? formatDate(sco.date) : '—'}</InfoRow>
              <InfoRow label="Change Type">
                {sco.changeType ? (
                  <Badge variant="primary" appearance="light" size="sm">
                    {sco.changeType.name}
                  </Badge>
                ) : (
                  '—'
                )}
              </InfoRow>
              <InfoRow label="Priority">
                {sco.priority ? (
                  <Badge
                    variant={getSCOPriorityVariant(sco.priority)}
                    appearance="light"
                    size="sm"
                  >
                    {PRIORITY_LABELS[sco.priority] ?? sco.priority}
                  </Badge>
                ) : (
                  '—'
                )}
              </InfoRow>
              <InfoRow label="Initiated By">
                {INITIATED_BY_LABELS[sco.initiatedBy] ?? sco.initiatedBy}
              </InfoRow>
              <InfoRow label="Purchase Order">
                {sco.purchaseOrder?.poNumber ?? '—'}
              </InfoRow>
              <InfoRow label="Vendor">{sco.vendor?.name ?? '—'}</InfoRow>
              <InfoRow label="Vendor Contact">{sco.vendorContactName ?? '—'}</InfoRow>
              <InfoRow label="Vendor Email">{sco.vendorContactEmail ?? '—'}</InfoRow>
              <InfoRow label="Vendor Ref #">{sco.vendorReferenceNumber ?? '—'}</InfoRow>
              {sco.scheduleImpactDays != null && sco.scheduleImpactDays > 0 && (
                <InfoRow label="Schedule Impact">
                  {sco.scheduleImpactDays} day{sco.scheduleImpactDays !== 1 ? 's' : ''}
                </InfoRow>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {(sco.reasonForChange || sco.detailedScope) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sco.reasonForChange && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                      Reason for Change
                    </h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {sco.reasonForChange}
                    </p>
                  </div>
                )}
                {sco.detailedScope && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                      Detailed Scope
                    </h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {sco.detailedScope}
                    </p>
                  </div>
                )}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
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
                          <td className="py-2.5 pr-4 font-medium">{li.description}</td>
                          <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                            {li.costCodeId ? costCodeMap.get(li.costCodeId) ?? '—' : '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{li.quantity}</td>
                          <td className="py-2.5 pr-4">{li.unit}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {formatCurrency(li.unitPrice)}
                          </td>
                          <td className="py-2.5 text-right font-medium tabular-nums">
                            {formatCurrency(li.amount)}
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
                      {Number((sco as any).markupAmount ?? 0) !== 0 && (
                        <tr>
                          <td colSpan={6} className="pt-1 text-right text-xs text-muted-foreground">
                            Markup
                          </td>
                          <td className="pt-1 text-right tabular-nums text-sm">
                            {formatCurrency(Number((sco as any).markupAmount))}
                          </td>
                        </tr>
                      )}
                      {Number((sco as any).taxAmount ?? 0) !== 0 && (
                        <tr>
                          <td colSpan={6} className="pt-1 text-right text-xs text-muted-foreground">
                            Tax ({(sco as any).taxPercent ?? 0}%)
                          </td>
                          <td className="pt-1 text-right tabular-nums text-sm">
                            {formatCurrency(Number((sco as any).taxAmount))}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t">
                        <td
                          colSpan={6}
                          className="pt-2 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                        >
                          Total
                        </td>
                        <td className="pt-2 text-right font-semibold tabular-nums">
                          {formatCurrency(sco.amount + Number((sco as any).markupAmount ?? 0) + Number((sco as any).taxAmount ?? 0))}
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

          {/* Documents / Attachments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
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
                      className="flex items-center justify-between rounded-lg border p-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {att.document?.name ?? 'Document'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {att.document?.id && (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => downloadFile.mutate(att.document!.id)}
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
        <DetailSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <div className="space-y-6 pt-2">
            {/* Financial Summary */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Financial Summary
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <InfoRow label="Subtotal">{formatCurrency(sco.amount)}</InfoRow>
                  {Number((sco as any).markupAmount ?? 0) !== 0 && (
                    <InfoRow label="Markup">{formatCurrency(Number((sco as any).markupAmount))}</InfoRow>
                  )}
                  {Number((sco as any).taxAmount ?? 0) !== 0 && (
                    <InfoRow label={`Tax (${(sco as any).taxPercent ?? 0}%)`}>
                      {formatCurrency(Number((sco as any).taxAmount))}
                    </InfoRow>
                  )}
                  <Separator className="my-2" />
                  <InfoRow label="Total">
                    <span className="font-semibold">
                      {formatCurrency(sco.amount + Number((sco as any).markupAmount ?? 0) + Number((sco as any).taxAmount ?? 0))}
                    </span>
                  </InfoRow>
                  {Number((sco as any).retainagePercent ?? 0) > 0 && (
                    <InfoRow label={`Retainage (${(sco as any).retainagePercent}%)`}>
                      {formatCurrency((sco.amount + Number((sco as any).markupAmount ?? 0) + Number((sco as any).taxAmount ?? 0)) * Number((sco as any).retainagePercent) / 100)}
                    </InfoRow>
                  )}
                  {(sco as any).paymentTerms && (
                    <InfoRow label="Payment Terms">
                      {String((sco as any).paymentTerms).replace(/_/g, ' ')}
                    </InfoRow>
                  )}
                  <Separator className="my-2" />
                  <InfoRow label="Purchase Order">
                    {sco.purchaseOrder?.poNumber ?? '—'}
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

      {/* ---- Delete confirmation ---- */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Change Order"
        description={
          <>
            This will permanently delete{' '}
            <strong>{sco.scoNumber ? `SCO ${sco.scoNumber}` : sco.title}</strong>. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          deleteMutation.mutate(scoId, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />

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
                    { scoId, data: { fileId: uploaded.id } },
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
