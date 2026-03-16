import { useState } from 'react';

import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileText,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  ShieldAlert,
  Trash2,
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
  const { pcoId = '' } = useParams<{ projectId: string; pcoId: string }>();
  const navigate = useNavigate();

  const { data: pco, isLoading } = usePCODetailQuery(pcoId);
  const { data: financialImpact } = usePCOFinancialImpactQuery(pcoId);

  const transitionMutation = useTransitionPCOStatusMutation();
  const approveMutation = useApprovePCOMutation();
  const rejectMutation = useRejectPCOMutation();
  const voidMutation = useVoidPCOMutation();
  const deleteMutation = useDeletePCOMutation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
              <InfoRow label="Cost Code">
                {pco.costCode ? `${pco.costCode.code} - ${pco.costCode.name}` : '—'}
              </InfoRow>
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

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Line Items ({pco.lineItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pco.lineItems.length > 0 ? (
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
                      {pco.lineItems.map((li, idx) => (
                        <tr key={li.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 pr-3">
                            <div className="font-medium">{li.description}</div>
                            {li.title && li.title !== li.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {li.title}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{li.qty}</td>
                          <td className="py-2.5 pr-3">{li.unit}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">
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
                        <td colSpan={5} className="pt-3 text-right text-sm text-muted-foreground">
                          Subtotal
                        </td>
                        <td className="pt-3 text-right font-medium tabular-nums">
                          {formatCurrency(pco.amount)}
                        </td>
                      </tr>
                      {(pco.markupAmount ?? 0) !== 0 && (
                        <tr>
                          <td colSpan={5} className="pt-1 text-right text-sm text-muted-foreground">
                            Markup
                          </td>
                          <td className="pt-1 text-right font-medium tabular-nums">
                            {formatCurrency(pco.markupAmount ?? 0)}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t">
                        <td colSpan={5} className="pt-2 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Total
                        </td>
                        <td className="pt-2 text-right font-semibold tabular-nums">
                          {formatCurrency(pco.amount + (pco.markupAmount ?? 0))}
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
    </div>
  );
}
