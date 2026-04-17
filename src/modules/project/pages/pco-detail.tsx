import { useState } from 'react';

import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Plus,
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
import { useUploadFileMutation, useDownloadFile } from '@modules/files/hooks/files.hooks';
import { InfoRow } from '@modules/project/components/info-row';
import { getPriorityVariant, getStatusBadgeVariant } from '@modules/project/constants/pco.constants';
import { DetailSidebar } from '@modules/directory/components';
import {
  useApprovePCOMutation,
  useDeletePCOMutation,
  usePCODetailQuery,
  usePCOFinancialImpactQuery,
  useRejectPCOMutation,
  useTransitionPCOStatusMutation,
  useVoidPCOMutation,
} from '../hooks';
import { useCostCodesQuery } from '@modules/catalog/hooks';
import { useAddPCOAttachmentMutation, useRemovePCOAttachmentMutation } from '../hooks/pco-attachment.hooks';
import { useProjectFolderQuery } from '../hooks/use-project-folder';

/* ---- Workflow transition definitions ---- */

/**
 * Backend statuses: DRAFT, PENDING_REVIEW, REVERTED, APPROVED,
 *   SENT_TO_GC, PENCILED, EXECUTED, REJECTED, VOID
 *
 * Terminal: REJECTED, VOID (no outbound transitions)
 * EXECUTED can only go to VOID
 * Reason required for: REVERTED, REJECTED, VOID
 *
 * Dedicated endpoints:
 *   POST /approve — only DRAFT, segregation-of-duties enforced
 *   POST /reject  — only DRAFT, reason >= 20 chars
 *   POST /void    — not VOID/REJECTED, reason >= 1 char
 *
 * Generic: PUT /status { status, reason?, onBehalfOf? }
 */

type WorkflowAction = {
  label: string;
  /** Target status name for the generic transition endpoint */
  targetStatus: string;
  /** Use a dedicated endpoint instead of generic transition */
  endpoint?: 'approve' | 'reject' | 'void';
  needsReason: boolean;
  /** Minimum reason length (defaults to 1) */
  minReasonLength?: number;
  primary?: boolean;
  destructive?: boolean;
};

/** Actions available per status (ordered by display priority) */
const WORKFLOW_ACTIONS: Record<string, WorkflowAction[]> = {
  DRAFT: [
    { label: 'Submit for Review', targetStatus: 'PENDING_REVIEW', needsReason: false, primary: true },
    { label: 'Approve Internally', targetStatus: 'APPROVED', endpoint: 'approve', needsReason: false },
    { label: 'Send to GC', targetStatus: 'SENT_TO_GC', needsReason: false },
    { label: 'Reject', targetStatus: 'REJECTED', endpoint: 'reject', needsReason: true, minReasonLength: 20, destructive: true },
    { label: 'Void', targetStatus: 'VOID', endpoint: 'void', needsReason: true, destructive: true },
  ],
  PENDING_REVIEW: [
    { label: 'Approve Internally', targetStatus: 'APPROVED', needsReason: false, primary: true },
    { label: 'Send to GC', targetStatus: 'SENT_TO_GC', needsReason: false },
    { label: 'Revert to Draft', targetStatus: 'REVERTED', needsReason: true },
    { label: 'Reject', targetStatus: 'REJECTED', needsReason: true, minReasonLength: 20, destructive: true },
    { label: 'Void', targetStatus: 'VOID', endpoint: 'void', needsReason: true, destructive: true },
  ],
  REVERTED: [
    { label: 'Return to Draft', targetStatus: 'DRAFT', needsReason: false, primary: true },
    { label: 'Submit for Review', targetStatus: 'PENDING_REVIEW', needsReason: false },
    { label: 'Reject', targetStatus: 'REJECTED', needsReason: true, minReasonLength: 20, destructive: true },
    { label: 'Void', targetStatus: 'VOID', endpoint: 'void', needsReason: true, destructive: true },
  ],
  APPROVED: [
    { label: 'Send to GC', targetStatus: 'SENT_TO_GC', needsReason: false, primary: true },
    { label: 'Revert', targetStatus: 'REVERTED', needsReason: true },
    { label: 'Void', targetStatus: 'VOID', endpoint: 'void', needsReason: true, destructive: true },
  ],
  SENT_TO_GC: [
    { label: 'GC Approved — Execute', targetStatus: 'EXECUTED', needsReason: false, primary: true },
    { label: 'GC Returned with Markups', targetStatus: 'PENCILED', needsReason: false },
    { label: 'Revert', targetStatus: 'REVERTED', needsReason: true },
    { label: 'Void', targetStatus: 'VOID', endpoint: 'void', needsReason: true, destructive: true },
  ],
  PENCILED: [
    { label: 'Return to Draft', targetStatus: 'DRAFT', needsReason: false, primary: true },
    { label: 'Execute', targetStatus: 'EXECUTED', needsReason: false },
    { label: 'Revert', targetStatus: 'REVERTED', needsReason: true },
    { label: 'Void', targetStatus: 'VOID', endpoint: 'void', needsReason: true, destructive: true },
  ],
  EXECUTED: [
    { label: 'Void', targetStatus: 'VOID', endpoint: 'void', needsReason: true, destructive: true },
  ],
  // REJECTED and VOID are terminal — no actions
};

/* ---- Page ---- */

export function PCODetailPage() {
  const { projectId = '', pcoId = '' } = useParams<{ projectId: string; pcoId: string }>();
  const navigate = useNavigate();

  const { data: pco, isLoading } = usePCODetailQuery(pcoId);
  const { data: financialImpact } = usePCOFinancialImpactQuery(pcoId);
  const { data: pcoFolderId } = useProjectFolderQuery(projectId || undefined, 'prime co');
  const { data: costCodesData } = useCostCodesQuery();

  // Use attachments from PCO detail response (avoids separate endpoint that may 404)
  const attachments = (pco?.attachments ?? []) as { id: string; documentId?: string; document?: { id: string; name: string } }[];

  // Cost code lookup for line items
  const costCodeMap = new Map(
    (costCodesData?.data ?? []).map((cc) => [cc.id, `${cc.code} - ${cc.name}`]),
  );

  const transitionMutation = useTransitionPCOStatusMutation();
  const approveMutation = useApprovePCOMutation();
  const rejectMutation = useRejectPCOMutation();
  const voidMutation = useVoidPCOMutation();
  const deleteMutation = useDeletePCOMutation();
  const addAttachmentMutation = useAddPCOAttachmentMutation();
  const removeAttachmentMutation = useRemovePCOAttachmentMutation();
  const uploadFileMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Generic workflow dialog state
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);
  const [actionReason, setActionReason] = useState('');

  const statusName = pco?.status?.name ?? '';
  const isDraft = statusName === 'DRAFT';
  const isTerminal = statusName === 'REJECTED' || statusName === 'VOID';

  const workflowActions = WORKFLOW_ACTIONS[statusName] ?? [];

  /* ---- Execute a workflow action ---- */
  function executeAction(action: WorkflowAction, reason?: string) {
    const onSuccess = () => { setActiveAction(null); setActionReason(''); };

    if (action.endpoint === 'approve') {
      approveMutation.mutate(pcoId, { onSuccess });
    } else if (action.endpoint === 'reject') {
      rejectMutation.mutate({ id: pcoId, data: { reason: reason! } }, { onSuccess });
    } else if (action.endpoint === 'void') {
      voidMutation.mutate({ id: pcoId, data: { reason: reason! } }, { onSuccess });
    } else {
      transitionMutation.mutate(
        { id: pcoId, data: { status: action.targetStatus, reason } },
        { onSuccess },
      );
    }
  }

  function handleActionClick(action: WorkflowAction) {
    if (action.needsReason) {
      setActiveAction(action);
      setActionReason('');
    } else {
      // No reason needed — for non-destructive quick actions, execute directly
      // For destructive ones, still confirm
      setActiveAction(action);
    }
  }

  const isActionPending =
    transitionMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    voidMutation.isPending;

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading change order...</div>
      </div>
    );
  }

  if (!pco) {
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
                Prime Change Orders
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ToolbarPageTitle>
                {pco.pcoNumber ? `PCO ${pco.pcoNumber}` : pco.title}
              </ToolbarPageTitle>
              {pco.status && !isTerminal && workflowActions.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-md px-2 py-0.5 hover:bg-accent transition-colors cursor-pointer">
                      <Badge variant={getStatusBadgeVariant(pco.status.name)} appearance="light" size="sm">
                        {pco.status.label}
                      </Badge>
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {workflowActions.map((action, i) => {
                      const showSeparator = action.destructive && i > 0 && !workflowActions[i - 1]?.destructive;
                      return (
                        <div key={action.targetStatus}>
                          {showSeparator && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            variant={action.destructive ? 'destructive' : undefined}
                            onClick={() => handleActionClick(action)}
                          >
                            {action.label}
                            {action.needsReason && (
                              <span className="ml-auto text-xs text-muted-foreground">(reason)</span>
                            )}
                          </DropdownMenuItem>
                        </div>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : pco.status ? (
                <Badge variant={getStatusBadgeVariant(pco.status.name)} appearance="light" size="sm">
                  {pco.status.label}
                </Badge>
              ) : null}
              {pco.priority && (
                <Badge variant={getPriorityVariant(pco.priority)} appearance="outline" size="sm">
                  {pco.priority}
                </Badge>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            {!isTerminal && (
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
                {!isTerminal && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                )}
                {isDraft && (
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
              {pco.pcoNumber && <InfoRow label="PCO #">{pco.pcoNumber}</InfoRow>}
              <InfoRow label="Title">{pco.title}</InfoRow>
              <InfoRow label="Date">{pco.date ? formatDate(pco.date) : '—'}</InfoRow>
              <InfoRow label="Change Type">
                {pco.changeType ? (
                  <Badge variant="primary" appearance="light" size="sm">
                    {pco.changeType.name}
                  </Badge>
                ) : (
                  '—'
                )}
              </InfoRow>
              <InfoRow label="Priority">
                {pco.priority ? (
                  <Badge variant={getPriorityVariant(pco.priority)} appearance="light" size="sm">
                    {pco.priority}
                  </Badge>
                ) : (
                  '—'
                )}
              </InfoRow>
              <InfoRow label="Impacts Schedule">
                {pco.impactsSchedule ? 'Yes' : 'No'}
              </InfoRow>
              {pco.impactsSchedule && pco.scheduleImpactDays != null && (
                <InfoRow label="Schedule Impact">
                  {pco.scheduleImpactDays} day{pco.scheduleImpactDays !== 1 ? 's' : ''}
                </InfoRow>
              )}
              <InfoRow label="Contact">{pco.contact?.fullName ?? '—'}</InfoRow>
            </CardContent>
          </Card>

          {/* Description */}
          {pco.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{pco.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Cost Estimation — grouped by category */}
          {pco.lineItems.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              {(['MATERIALS', 'LABOR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER'] as const).map((cat) => {
                const items = pco.lineItems.filter((li) => (li.category ?? 'MATERIALS') === cat);
                if (items.length === 0) return null;
                const sectionTotal = items.reduce((s, li) => s + li.amount, 0);
                const catLabel: Record<string, string> = {
                  MATERIALS: 'Materials',
                  LABOR: 'Labor',
                  EQUIPMENT: 'Equipment',
                  SUBCONTRACTOR: 'Subcontractor',
                  OTHER: 'Other',
                };
                return (
                  <div key={cat} className="border-b last:border-b-0">
                    {/* Section header */}
                    <div className="bg-muted/50 px-3 py-2.5">
                      <h3 className="text-sm font-semibold">{catLabel[cat]}</h3>
                    </div>
                    {/* Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase w-10">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[160px]">Cost Code</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">Item Name</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[80px]">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[100px]">Unit</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[120px]">Unit Cost</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[120px]">Item Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((li, idx) => (
                          <tr key={li.id} className="border-b last:border-0">
                            <td className="px-3 py-2.5 text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{li.costCodeId ? costCodeMap.get(li.costCodeId) ?? '—' : '—'}</td>
                            <td className="px-3 py-2.5">
                              <div className="font-medium">{li.description}</div>
                              {li.title && li.title !== li.description && (
                                <div className="text-xs text-muted-foreground mt-0.5">{li.title}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{li.qty}</td>
                            <td className="px-3 py-2.5">{li.unit}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(li.unitPrice)}</td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(li.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Section subtotal */}
                    <div className="flex items-center justify-end gap-3 px-3 py-2 border-t">
                      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{catLabel[cat]}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(sectionTotal)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Grand totals */}
              <div className="bg-muted/30 px-3 py-3 space-y-1">
                <div className="flex items-center justify-end gap-3">
                  <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Subtotal</span>
                  <span className="text-sm font-medium tabular-nums min-w-[100px] text-right">{formatCurrency(pco.amount)}</span>
                </div>
                {(pco.markupAmount ?? 0) !== 0 && (
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Markup</span>
                    <span className="text-sm font-medium tabular-nums min-w-[100px] text-right">{formatCurrency(pco.markupAmount ?? 0)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex items-center justify-end gap-3">
                  <span className="text-xs font-semibold tracking-widest uppercase">Total</span>
                  <span className="text-sm font-semibold tabular-nums min-w-[100px] text-right">{formatCurrency(pco.amount + (pco.markupAmount ?? 0))}</span>
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No line items.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents / Attachments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Documents ({attachments.length})
              </CardTitle>
              {!isTerminal && pcoFolderId && (
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
                            onClick={() => downloadFile.mutate(att.document!)}
                          >
                            <Download className="size-3.5" />
                          </Button>
                        )}
                        {!isTerminal && (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() =>
                              removeAttachmentMutation.mutate({
                                pcoId,
                                attachmentId: att.id,
                              })
                            }
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
                  {!isTerminal && pcoFolderId && (
                    <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                      <Plus className="size-4" />
                      Add Document
                    </Button>
                  )}
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
                  <InfoRow label="Subtotal">{formatCurrency(pco.amount)}</InfoRow>
                  <InfoRow label="Markup">{formatCurrency(pco.markupAmount ?? 0)}</InfoRow>
                  <Separator className="my-2" />
                  <InfoRow label="Total">
                    <span className="font-semibold">{formatCurrency(pco.amount + (pco.markupAmount ?? 0))}</span>
                  </InfoRow>
                </CardContent>
              </Card>
            </div>

            {/* Financial Impact */}
            {financialImpact && (
              <div>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                  Financial Impact
                </div>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <InfoRow label="Original Contract">
                      {formatCurrency(financialImpact.current.originalContractValue)}
                    </InfoRow>
                    <InfoRow label="Approved PCO Total">
                      {formatCurrency(financialImpact.current.approvedPCOTotal)}
                    </InfoRow>
                    <InfoRow label="This PCO">
                      {formatCurrency(financialImpact.thisPCO.amount)}
                    </InfoRow>
                    <Separator className="my-2" />
                    <InfoRow label="Revised (after)">
                      {formatCurrency(financialImpact.afterApproval.revisedContractValue)}
                    </InfoRow>
                    <InfoRow label="% Change">
                      {financialImpact.afterApproval.percentChangeFromOriginal.toFixed(2)}%
                    </InfoRow>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Timestamps */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Timeline
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {pco.createdAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="size-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="text-sm font-medium">{formatDate(pco.createdAt)}</div>
                      </div>
                    </div>
                  )}
                  {pco.approvedAt && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-4 text-success mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Approved</div>
                        <div className="text-sm font-medium">{formatDate(pco.approvedAt)}</div>
                      </div>
                    </div>
                  )}
                  {pco.rejectedAt && (
                    <div className="flex items-start gap-3">
                      <XCircle className="size-4 text-destructive mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Rejected</div>
                        <div className="text-sm font-medium">{formatDate(pco.rejectedAt)}</div>
                        {pco.rejectionReason && (
                          <p className="text-xs text-muted-foreground mt-1">{pco.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {pco.voidedAt && (
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="size-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Voided</div>
                        <div className="text-sm font-medium">{formatDate(pco.voidedAt)}</div>
                        {pco.voidReason && (
                          <p className="text-xs text-muted-foreground mt-1">{pco.voidReason}</p>
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

      {/* ---- Workflow action dialog ---- */}
      {activeAction && !activeAction.needsReason && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setActiveAction(null); }}
          title={activeAction.label}
          description={
            <>
              Are you sure you want to <strong>{activeAction.label.toLowerCase()}</strong>{' '}
              <strong>{pco.pcoNumber ? `PCO ${pco.pcoNumber}` : pco.title}</strong>
              {activeAction.targetStatus === 'APPROVED' || activeAction.endpoint === 'approve'
                ? <> for <strong>{formatCurrency(pco.amount)}</strong></>
                : null}
              ?
            </>
          }
          confirmLabel={activeAction.label}
          variant={activeAction.destructive ? 'destructive' : 'default'}
          onConfirm={() => executeAction(activeAction)}
          isPending={isActionPending}
        />
      )}

      {activeAction && activeAction.needsReason && (
        <Dialog open onOpenChange={(open) => { if (!open) { setActiveAction(null); setActionReason(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{activeAction.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Provide a reason for this action on{' '}
                <strong>{pco.pcoNumber ? `PCO ${pco.pcoNumber}` : pco.title}</strong>.
              </p>
              <Textarea
                placeholder={`Reason${(activeAction.minReasonLength ?? 1) > 1 ? ` (min ${activeAction.minReasonLength} characters)` : ''}...`}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
              />
              {actionReason.length > 0 && actionReason.length < (activeAction.minReasonLength ?? 1) && (
                <p className="text-xs text-destructive">
                  Reason must be at least {activeAction.minReasonLength} characters (
                  {(activeAction.minReasonLength ?? 1) - actionReason.length} more needed).
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActiveAction(null); setActionReason(''); }}>
                Cancel
              </Button>
              <Button
                variant={activeAction.destructive ? 'destructive' : 'primary'}
                disabled={actionReason.length < (activeAction.minReasonLength ?? 1) || isActionPending}
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
            <strong>{pco.pcoNumber ? `PCO ${pco.pcoNumber}` : pco.title}</strong>. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          deleteMutation.mutate(pcoId, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />

      {/* ---- Upload file dialog ---- */}
      {pcoFolderId && (
        <UploadFileDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={pcoFolderId}
          onSubmit={({ file, data }) => {
            uploadFileMutation.mutate(
              { file, data },
              {
                onSuccess: (uploaded) => {
                  addAttachmentMutation.mutate(
                    { pcoId, data: { fileId: uploaded.id } },
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
