import { useMemo, useState } from 'react';

import { DetailSidebar } from '@/app/components/detail-sidebar';
import { PdfPreviewDialog } from '@/app/components/pdf-preview-dialog';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { FileDropZone } from '@/app/components/ui/file-drop-zone';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { StatsCard } from '@/app/components/ui/stats-card';
import { Textarea } from '@/app/components/ui/textarea';
import { useAccess } from '@/app/contexts/access-context';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import type { GeneratedPdfFile } from '@/app/lib/generated-pdf';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { ActivityFeed, type ActivityItem } from '@/core/ui/components/sections/activity-feed';
import { useActivityLogQuery } from '@/modules/directory/hooks/activity.hooks';
import { useVendorsQuery } from '@/modules/directory/hooks/vendors.hooks';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import {
  useDownloadFile,
  useFilePreviewQuery,
  useUploadFileMutation,
} from '@/modules/files/hooks/files.hooks';
import { EmailComposePreviewDialog } from '@/modules/mail/components/email-compose-preview-dialog';
import { useFeatureMailDraftQuery, useSendFeatureMailMutation } from '@/modules/mail/hooks';
import type { FeatureMailTarget } from '@/modules/mail/schemas/mail.schema';
import {
  RFQCreatePOPreviewDialog,
  RFQDetailAttachmentsCard,
  RFQDetailDeliverablesCard,
  RFQDetailVendorsCard,
} from '@/modules/project/components/rfq';
import { InfoRow, ProjectDetailPageLoading } from '@/modules/project/components/shared';
import { getRfqStatusVariant, RFQ_TRACK_LABELS } from '@/modules/project/constants/rfq';
import {
  useAddRFQAttachmentMutation,
  useAddVendorMutation,
  useAwardRFQMutation,
  useBidComparisonQuery,
  useCancelRFQMutation,
  useDeclineInviteMutation,
  useDeleteRFQMutation,
  useGenerateRFQVendorPdfMutation,
  usePublishRFQMutation,
  useRemoveQuoteMutation,
  useRemoveRFQAttachmentMutation,
  useRemoveVendorMutation,
  useRFQDetailQuery,
  useRFQStatusesQuery,
  useSubmitQuoteMutation,
  useUnawardRFQMutation,
  useChangeRFQStatusMutation as useUpdateRFQStatusMutation,
  useEditQuoteMutation as useUpdateVendorQuoteMutation,
  useVoidAwardMutation,
} from '@/modules/project/hooks/rfq';
import { useProjectFolderQuery } from '@/modules/project/hooks/use-project-folder';
import type { RFQQuoteAttachment, RFQStatus } from '@/modules/project/schemas/rfq';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  History,
  Mail,
  PanelRightOpen,
  Paperclip,
  Pencil,
  PlusCircle,
  Send,
  ShieldAlert,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

/* ---- Quote Document Preview ---- */

function QuoteDocPreview({
  documentId,
  name,
  mimeType,
}: {
  documentId: string;
  name: string;
  mimeType?: string;
}) {
  const { data: url, isLoading } = useFilePreviewQuery(documentId, !!documentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full text-center p-4">
        <FileText className="size-12 text-muted-foreground/40" />
      </div>
    );
  }

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf');

  if (isImage) {
    return <img src={url} alt={name} className="w-full h-full object-contain p-2" />;
  }

  if (isPdf) {
    return <iframe src={url} title={name} className="w-full h-full border-0" />;
  }

  // Generic file — show icon + name + download
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 gap-2">
      <FileText className="size-10 text-muted-foreground/40" />
      <p className="text-xs font-medium truncate max-w-full">{name}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline"
      >
        View / Download
      </a>
    </div>
  );
}

/* ---- Page ---- */

export default function RFQDetailPage() {
  const { can } = useAccess();
  const { projectId = '', rfqId = '' } = useParams<{ projectId: string; rfqId: string }>();
  const navigate = useNavigate();

  const { data: rfq, isLoading, refetch: refetchRfqDetail } = useRFQDetailQuery(rfqId);
  useBreadcrumbLabel(
    projectId && rfqId ? `/app/project/${projectId}/rfqs/${rfqId}` : undefined,
    rfq?.rfqNumber ?? undefined
  );

  const publishMutation = usePublishRFQMutation();
  const cancelMutation = useCancelRFQMutation();
  const awardMutation = useAwardRFQMutation();
  const voidMutation = useVoidAwardMutation();
  const unawardMutation = useUnawardRFQMutation();
  const generateVendorPdfMutation = useGenerateRFQVendorPdfMutation();
  const sendVendorEmailMutation = useSendFeatureMailMutation();
  const deleteMutation = useDeleteRFQMutation();
  const addVendorMutation = useAddVendorMutation();
  const removeVendorMutation = useRemoveVendorMutation();
  const submitQuoteMutation = useSubmitQuoteMutation();
  const updateQuoteMutation = useUpdateVendorQuoteMutation();
  const removeQuoteMutation = useRemoveQuoteMutation();
  const updateStatusMutation = useUpdateRFQStatusMutation();
  const declineInviteMutation = useDeclineInviteMutation();
  const addAttachmentMutation = useAddRFQAttachmentMutation();
  const removeAttachmentMutation = useRemoveRFQAttachmentMutation();
  const uploadFileMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

  const rfqFolderQuery = useProjectFolderQuery(projectId, 'rfq');

  const { data: rfqStatuses } = useRFQStatusesQuery();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Publish dialog
  const [publishOpen, setPublishOpen] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

  // Invite vendors dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteVendorIds, setInviteVendorIds] = useState<string[]>([]);

  // Upload / edit quotation dialog
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [, setQuoteVendorId] = useState<string>('');
  const [quoteInviteId, setQuoteInviteId] = useState<string>('');
  const [quoteAmount, setQuoteAmount] = useState<number | ''>('');
  const [quoteLeadTime, setQuoteLeadTime] = useState('');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [isQuoteViewOnly, setIsQuoteViewOnly] = useState(false);
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<RFQQuoteAttachment[]>([]);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Void award dialog
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Award dialog
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardQuoteIds, setAwardQuoteIds] = useState<string[]>([]);

  // Create PO preview
  const [createPOOpen, setCreatePOOpen] = useState(false);

  // Upload attachment dialog
  const [uploadOpen, setUploadOpen] = useState(false);

  // Bid comparison dialog
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selectedCompareVendorId, setSelectedCompareVendorId] = useState<string | null>(null);
  const [activePreviewDocId, setActivePreviewDocId] = useState<string | null>(null);

  // Generated PDF preview
  const [vendorPdfPreviewOpen, setVendorPdfPreviewOpen] = useState(false);
  const [vendorPdfPreview, setVendorPdfPreview] = useState<GeneratedPdfFile | null>(null);

  // Vendor email dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<FeatureMailTarget | null>(null);

  const vendorEmailDraftQuery = useFeatureMailDraftQuery(emailTarget, emailOpen);

  const {
    data: bidComparison,
    isLoading: isComparisonLoading,
    isError: isComparisonError,
  } = useBidComparisonQuery(rfqId, comparisonOpen);

  const comparisonRows = useMemo(() => {
    const detailInvites = rfq?.invites ?? [];
    const detailQuotes = rfq?.quotes ?? [];
    const comparisonQuotes = bidComparison?.quotes ?? [];

    return detailInvites.map((invite) => {
      const vendorId = invite.vendor?.id ?? invite.vendorId ?? '';
      const quote = comparisonQuotes.find((item) => item.vendorId === vendorId);
      const detailQuote = quote ? detailQuotes.find((item) => item.id === quote.quoteId) : null;

      return {
        invite,
        vendorId,
        vendorName: invite.vendor?.name ?? 'Unknown Vendor',
        vendorEmail: invite.vendor?.email ?? undefined,
        declined: !!invite.declinedToQuote,
        quote,
        hasQuote: !!quote,
        isAwarded: !!detailQuote?.isAwarded || quote?.status?.name === 'AWARDED',
      };
    });
  }, [bidComparison?.quotes, rfq?.invites, rfq?.quotes]);

  const selectedComparisonRow =
    comparisonRows.find((row) => row.vendorId && row.vendorId === selectedCompareVendorId) ?? null;
  const selectedComparisonQuote = selectedComparisonRow?.quote ?? null;
  const selectedComparisonAttachments = selectedComparisonQuote?.attachments ?? [];
  const selectedPreviewAttachment =
    selectedComparisonAttachments.find((attachment) => attachment.id === activePreviewDocId) ??
    selectedComparisonAttachments[0];

  const { data: activityData, isLoading: isActivityLoading } = useActivityLogQuery({
    entityType: 'rfq',
    entityId: rfqId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    size: 50,
  });

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!activityData?.data) return [];
    return activityData.data.map((log) => {
      const action = log.action.toLowerCase();
      let icon = <Clock className="size-4" />;
      let color = 'border-muted-foreground/20 bg-muted/30';

      if (action.includes('create') || action.includes('publish')) {
        icon = <PlusCircle className="size-4 text-primary" />;
        color = 'border-primary/20 bg-primary/5';
      } else if (action.includes('update')) {
        icon = <Pencil className="size-4 text-info" />;
        color = 'border-info/20 bg-info/5';
      } else if (action.includes('award')) {
        icon = <Trophy className="size-4 text-warning" />;
        color = 'border-warning/20 bg-warning/5';
      } else if (
        action.includes('delete') ||
        action.includes('cancel') ||
        action.includes('void')
      ) {
        icon = <Trash2 className="size-4 text-destructive" />;
        color = 'border-destructive/20 bg-destructive/5';
      } else if (action.includes('invite') || action.includes('quote')) {
        icon = <CheckCircle2 className="size-4 text-success" />;
        color = 'border-success/20 bg-success/5';
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
          : '—',
        avatar: log.user?.image || undefined,
        icon,
        color,
      };
    });
  }, [activityData]);

  // Vendor data for dialogs
  const { data: vendorsData } = useVendorsQuery({ page: 1, limit: 1000 });
  const vendors = vendorsData?.data ?? [];

  const statusObj = typeof rfq?.status === 'object' ? rfq.status : null;
  const statusName = statusObj?.name ?? (typeof rfq?.status === 'string' ? rfq.status : '');
  const isDraft = statusName === 'DRAFT';
  const isPublished = statusName === 'PUBLISHED';
  const isEvaluation = statusName === 'EVALUATION';
  const isAwarded = statusName === 'AWARDED';
  const isTerminal = statusName === 'CANCELLED' || statusName === 'VOID';
  const canEditDraftRfq = can('rfq', 'update') && isDraft;
  const canManagePublishedRfq = can('rfq', 'update') && isPublished;
  const canWorkflowRfq = can('rfq', 'workflow');
  const canCreatePurchaseOrder = can('purchaseOrder', 'create') && isAwarded;
  const canEmailVendors = can('mail', 'send');

  const isActionPending =
    publishMutation.isPending ||
    cancelMutation.isPending ||
    awardMutation.isPending ||
    voidMutation.isPending ||
    addVendorMutation.isPending ||
    submitQuoteMutation.isPending ||
    unawardMutation.isPending ||
    sendVendorEmailMutation.isPending ||
    updateStatusMutation.isPending ||
    addAttachmentMutation.isPending ||
    removeAttachmentMutation.isPending;

  if (isLoading) {
    return <ProjectDetailPageLoading />;
  }

  if (!rfq) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">RFQ not found.</div>
      </div>
    );
  }

  const deliverables = rfq.deliverables ?? [];
  const invites = rfq.invites ?? [];
  const quotes = rfq.quotes ?? [];
  const attachments = rfq.attachments ?? [];

  const quoteGrandTotals = quotes.map((q) => q.grandTotal).filter((v): v is number => v != null);
  const lowestQuote = quoteGrandTotals.length > 0 ? Math.min(...quoteGrandTotals) : null;
  const highestQuote = quoteGrandTotals.length > 0 ? Math.max(...quoteGrandTotals) : null;

  const deliverablesTotal = deliverables.reduce(
    (sum, d) => sum + (d.estimatedTotal ?? (d.estimatedUnitPrice ?? 0) * (d.quantity ?? 0)),
    0
  );

  // IDs of vendors already invited
  const alreadyInvitedIds = new Set(invites.map((inv) => inv.vendor?.id).filter(Boolean));

  function openQuoteDialog(
    inviteId: string,
    vendorId: string,
    existingQuoteId?: string,
    viewOnly = false
  ) {
    setQuoteInviteId(inviteId);
    setQuoteVendorId(vendorId);
    setEditingQuoteId(existingQuoteId ?? null);
    setIsQuoteViewOnly(viewOnly);
    // Pre-fill if editing existing quote
    if (existingQuoteId) {
      const eq = quotes.find((q) => q.id === existingQuoteId);
      setQuoteAmount(eq?.grandTotal ?? eq?.totalAmount ?? '');
      // Use leadTimeDays if available (numeric), fallback to notes but strip non-numeric
      const lt = eq?.leadTimeDays?.toString() || eq?.notes?.replace(/[^0-9]/g, '') || '';
      setQuoteLeadTime(lt);
      setExistingAttachments(eq?.attachments ?? []);
    } else {
      setQuoteAmount('');
      setQuoteLeadTime('');
      setExistingAttachments([]);
    }
    setQuoteOpen(true);
  }

  function resetQuoteDialog() {
    setQuoteOpen(false);
    setQuoteVendorId('');
    setQuoteInviteId('');
    setQuoteAmount('');
    setQuoteLeadTime('');
    setEditingQuoteId(null);
    setIsQuoteViewOnly(false);
    setQuoteFile(null);
    setExistingAttachments([]);
  }

  function handleAwardFromTable(quoteId: string) {
    setAwardQuoteIds([quoteId]);
    setAwardOpen(true);
  }

  function handleUnaward() {
    unawardMutation.mutate(rfqId);
  }

  function handleVendorPdfPreviewOpenChange(open: boolean) {
    setVendorPdfPreviewOpen(open);
    if (!open) setVendorPdfPreview(null);
  }

  function handleGenerateVendorPdf(inviteId: string, vendorName: string) {
    generateVendorPdfMutation.mutate(
      { quoteId: inviteId, vendorName },
      {
        onSuccess: (file) => {
          setVendorPdfPreview(file);
          setVendorPdfPreviewOpen(true);
        },
      }
    );
  }

  function handleEmailVendor(inviteId: string) {
    setEmailTarget({ feature: 'rfq.vendorRequest', entityId: inviteId });
    sendVendorEmailMutation.reset();
    setEmailOpen(true);
  }

  function handleEmailAllVendors() {
    setEmailTarget({ feature: 'rfq.vendorRequestAll', entityId: rfqId });
    sendVendorEmailMutation.reset();
    setEmailOpen(true);
  }

  function handleEmailOpenChange(open: boolean) {
    setEmailOpen(open);
    if (!open) {
      setEmailTarget(null);
      sendVendorEmailMutation.reset();
    }
  }

  return (
    <div className="container-fluid max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7.5 lg:py-7.5">
      <PdfPreviewDialog
        open={vendorPdfPreviewOpen}
        onOpenChange={handleVendorPdfPreviewOpenChange}
        file={vendorPdfPreview}
        title={vendorPdfPreview?.fileName}
      />
      <EmailComposePreviewDialog
        open={emailOpen}
        onOpenChange={handleEmailOpenChange}
        title={emailTarget?.feature === 'rfq.vendorRequestAll' ? 'Email All Vendors' : 'Email RFQ'}
        draft={vendorEmailDraftQuery.data ?? null}
        isLoading={vendorEmailDraftQuery.isLoading}
        isSending={sendVendorEmailMutation.isPending}
        recipientsReadOnly
        onSend={async (payload) => {
          if (!emailTarget) return;
          await sendVendorEmailMutation.mutateAsync({
            feature: emailTarget.feature,
            entityId: emailTarget.entityId,
            draft: payload,
          });
          await refetchRfqDetail();
          handleEmailOpenChange(false);
        }}
      />

      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Back to RFQs
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToolbarPageTitle>{rfq.title}</ToolbarPageTitle>
              {rfq.status && rfqStatuses && rfqStatuses.length > 0 ? (
                <Select
                  value={statusObj?.id || (typeof rfq.status === 'string' ? rfq.status : '')}
                  onValueChange={(statusId) => {
                    if (statusId !== (statusObj?.id || rfq.status)) {
                      updateStatusMutation.mutate({ id: rfqId, statusId });
                    }
                  }}
                >
                  <SelectTrigger className="h-8 min-w-24 bg-transparent border-none p-0 focus:ring-0">
                    <Badge variant={getRfqStatusVariant(statusName)} appearance="light" size="sm">
                      {statusObj?.label || statusName}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {rfqStatuses
                      .filter(
                        (status): status is RFQStatus & { id: string } =>
                          typeof status.id === 'string' && status.id.length > 0
                      )
                      .map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.label ?? status.name ?? status.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : rfq.status ? (
                <Badge variant={getRfqStatusVariant(statusName)} appearance="light" size="sm">
                  {statusObj?.label || statusName}
                </Badge>
              ) : null}
              {rfq.rfqNumber && (
                <span className="text-sm text-muted-foreground">RFQ #{rfq.rfqNumber}</span>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            {canEditDraftRfq && (
              <Button variant="outline" size="sm" asChild>
                <Link to="edit">
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
            )}
            {canWorkflowRfq && isDraft && (
              <Button size="sm" onClick={() => setPublishOpen(true)}>
                <Send className="size-4" />
                Publish
              </Button>
            )}
            {canWorkflowRfq && (isPublished || isEvaluation || isAwarded) && quotes.length > 0 && (
              <Button size="sm" onClick={() => setAwardOpen(true)}>
                <Trophy className="size-4" />
                Award
              </Button>
            )}

            {canWorkflowRfq && !isTerminal && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {(isPublished || isEvaluation) && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setCancelReason('');
                        setCancelOpen(true);
                      }}
                    >
                      Cancel RFQ
                    </DropdownMenuItem>
                  )}
                  {isAwarded && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setVoidReason('');
                        setVoidOpen(true);
                      }}
                    >
                      Void Award
                    </DropdownMenuItem>
                  )}
                  {isDraft && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!sidebarOpen && (
              <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)}>
                <PanelRightOpen className="size-4" />
                Details
              </Button>
            )}
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* ---- Two-column layout ---- */}
      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row lg:items-start">
        {/* Left column */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatsCard
              icon={<Users className="size-6 text-primary" />}
              bgClass="bg-primary/10"
              label="Vendors Invited"
              value={invites.length}
              description="Total Invited"
            />
            <StatsCard
              icon={<FileText className="size-6 text-success" />}
              bgClass="bg-success/10"
              label="Quotes Received"
              value={quotes.length}
              description="Active Bids"
            />
            <StatsCard
              icon={<DollarSign className="size-6 text-warning" />}
              bgClass="bg-warning/10"
              label="Lowest Quote"
              value={lowestQuote != null ? formatCurrency(lowestQuote) : '—'}
              description={lowestQuote != null ? 'Lowest Current Bid' : undefined}
            />
          </div>

          {/* Quick Actions */}
          {!isDraft && (quotes.length >= 2 || (canEmailVendors && invites.length > 0)) && (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {quotes.length >= 2 && (
                <Button variant="outline" size="sm" onClick={() => setComparisonOpen(true)}>
                  <FileText className="size-4" />
                  Compare {quotes.length} Quotes
                </Button>
              )}
              {canEmailVendors && invites.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sendVendorEmailMutation.isPending}
                  onClick={handleEmailAllVendors}
                >
                  <Mail className="size-4" />
                  Email All Vendors
                </Button>
              )}
            </div>
          )}

          <RFQDetailVendorsCard
            invites={invites}
            quotes={quotes}
            purchaseOrders={rfq.purchaseOrders}
            awardedVendorId={rfq.awardedVendorId}
            isTerminal={isTerminal}
            isPublished={isPublished}
            isEvaluation={isEvaluation}
            isAwarded={isAwarded}
            canManageVendors={canManagePublishedRfq}
            canManageQuotes={canManagePublishedRfq}
            canAwardQuotes={canWorkflowRfq}
            canCreatePurchaseOrder={canCreatePurchaseOrder}
            canEmailVendors={canEmailVendors}
            onInviteVendor={() => {
              setInviteVendorIds([]);
              setInviteOpen(true);
            }}
            onOpenQuote={openQuoteDialog}
            onGenerateVendorPdf={handleGenerateVendorPdf}
            onEmailVendor={handleEmailVendor}
            onAwardQuote={handleAwardFromTable}
            onUnaward={handleUnaward}
            onGeneratePO={() => setCreatePOOpen(true)}
            onRemoveQuote={(quoteId) => removeQuoteMutation.mutate({ rfqId, id: quoteId })}
            onRemoveVendor={(inviteId) => removeVendorMutation.mutate({ rfqId, quoteId: inviteId })}
            onDeclineInvite={(inviteId) =>
              declineInviteMutation.mutate({ rfqId, data: { id: inviteId } })
            }
            isGeneratingVendorPdf={generateVendorPdfMutation.isPending}
          />

          <RFQDetailAttachmentsCard
            attachments={attachments}
            canEdit={canEditDraftRfq}
            canUpload={canEditDraftRfq && !!rfqFolderQuery.data}
            isRemoving={removeAttachmentMutation.isPending}
            onUpload={() => setUploadOpen(true)}
            onDownload={(document) => downloadFile.mutate(document)}
            onRemove={(attachmentId) => {
              removeAttachmentMutation.mutate({
                rfqId,
                attachmentId,
              });
            }}
          />

          {canEditDraftRfq && rfqFolderQuery.data && (
            <UploadFileDialog
              open={uploadOpen}
              onOpenChange={setUploadOpen}
              parentId={rfqFolderQuery.data}
              onSubmit={async (payload) => {
                try {
                  const fileItem = await uploadFileMutation.mutateAsync(payload);
                  await addAttachmentMutation.mutateAsync({ rfqId, documentId: fileItem.id });
                } finally {
                  setUploadOpen(false);
                }
              }}
              isSubmitting={uploadFileMutation.isPending || addAttachmentMutation.isPending}
            />
          )}

          <RFQDetailDeliverablesCard deliverables={deliverables} />

          {/* Detailed Scope */}
          {rfq.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                  Detailed Scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {rfq.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activityChildren={
            <div className="p-4">
              {isActivityLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground uppercase tracking-normal">
                  Loading activity...
                </div>
              ) : activityItems.length > 0 ? (
                <ActivityFeed items={activityItems} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <History className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground uppercase tracking-normal font-bold">
                    No activity recorded yet.
                  </p>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-6 pt-2">
            <div>
              <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-3">
                RFQ Details
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  {rfq.rfqNumber && <InfoRow label="RFQ #">{rfq.rfqNumber}</InfoRow>}
                  <InfoRow label="Title">{rfq.title}</InfoRow>
                  <InfoRow label="Project">
                    {rfq.project
                      ? `${rfq.project.name}${rfq.project.jobNumber ? ` (${rfq.project.jobNumber})` : ''}`
                      : '—'}
                  </InfoRow>
                  <InfoRow label="Track">
                    {rfq.track ? (RFQ_TRACK_LABELS[rfq.track] ?? rfq.track) : '—'}
                  </InfoRow>
                  <InfoRow label="Bid Deadline">{formatDate(rfq.bidDeadline || '')}</InfoRow>
                  {rfq.minimumVendors != null && (
                    <InfoRow label="Min. Vendors">{rfq.minimumVendors}</InfoRow>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-3">
                Financial Summary
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  {deliverablesTotal > 0 && (
                    <InfoRow label="Est. Deliverables">{formatCurrency(deliverablesTotal)}</InfoRow>
                  )}
                  {lowestQuote != null && (
                    <>
                      {deliverablesTotal > 0 && <Separator className="my-2" />}
                      <InfoRow label="Lowest Quote">{formatCurrency(lowestQuote)}</InfoRow>
                    </>
                  )}
                  {highestQuote != null && (
                    <InfoRow label="Highest Quote">{formatCurrency(highestQuote)}</InfoRow>
                  )}
                  {isAwarded && rfq.awardedAmount != null && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow label="Awarded Amount" valueClassName="text-success">
                        {formatCurrency(rfq.awardedAmount)}
                      </InfoRow>
                    </>
                  )}
                  {isAwarded && rfq.awardedVendor && (
                    <InfoRow label="Awarded Vendor">{rfq.awardedVendor.name}</InfoRow>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-3">
                Timeline
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {rfq.createdAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="size-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="text-sm font-medium">{formatDate(rfq.createdAt)}</div>
                      </div>
                    </div>
                  )}
                  {!isDraft && (
                    <div className="flex items-start gap-3">
                      <Send className="size-4 text-primary mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Published</div>
                        <div className="text-sm font-medium">
                          {invites.length} vendor{invites.length !== 1 ? 's' : ''} invited
                        </div>
                      </div>
                    </div>
                  )}
                  {isAwarded && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-4 text-success mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Awarded</div>
                        <div className="text-sm font-medium">
                          {rfq.awardedVendor ? rfq.awardedVendor.name : 'Vendor awarded'}
                        </div>
                      </div>
                    </div>
                  )}
                  {statusName === 'CANCELLED' && (
                    <div className="flex items-start gap-3">
                      <XCircle className="size-4 text-destructive mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Cancelled</div>
                        {rfq.cancellationReason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {rfq.cancellationReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {statusName === 'VOID' && (
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="size-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Voided</div>
                        {rfq.voidReason && (
                          <p className="text-xs text-muted-foreground mt-1">{rfq.voidReason}</p>
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

      {/* ---- Bid Comparison Dialog ---- */}
      <Dialog
        open={comparisonOpen}
        onOpenChange={(open) => {
          setComparisonOpen(open);
          if (!open) {
            setSelectedCompareVendorId(null);
            setActivePreviewDocId(null);
          }
        }}
      >
        <DialogContent
          variant="fullscreen"
          showCloseButton={false}
          className="inset-4 gap-0 overflow-hidden p-0"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-col gap-4 border-b px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <DialogTitle className="text-xl">Bid Comparison</DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rfq.rfqNumber ? `RFQ #${rfq.rfqNumber}` : rfq.title}
                  {' - '}
                  {bidComparison?.quotes.length ?? quotes.length} quote
                  {(bidComparison?.quotes.length ?? quotes.length) !== 1 ? 's' : ''} from{' '}
                  {invites.length} vendor{invites.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex items-start justify-between gap-4 lg:justify-end">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                  {rfq.createdAt && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Issue Date
                      </div>
                      <div className="font-medium">{formatDate(rfq.createdAt)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Due Date
                    </div>
                    <div className="font-medium">{formatDate(rfq.bidDeadline || '')}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Submitted
                    </div>
                    <div className="font-medium">
                      {bidComparison?.statistics.quotesSubmitted ?? quotes.length}/
                      {bidComparison?.statistics.quotesExpected ?? invites.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Range
                    </div>
                    <div className="font-medium">
                      {bidComparison?.statistics.lowestQuote != null &&
                      bidComparison.statistics.highestQuote != null
                        ? `${formatCurrency(bidComparison.statistics.lowestQuote)} - ${formatCurrency(
                            bidComparison.statistics.highestQuote
                          )}`
                        : 'No quotes'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  mode="icon"
                  className="size-8 shrink-0"
                  onClick={() => setComparisonOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {isComparisonLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                <div className="mb-4 size-8 animate-spin rounded-full border-2 border-muted-foreground/10 border-t-primary" />
                <p className="text-sm">Loading comparison...</p>
              </div>
            ) : isComparisonError ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <ShieldAlert className="mb-4 size-10 text-destructive/50" />
                <p className="text-sm font-medium text-destructive">
                  Failed to load comparison data.
                </p>
              </div>
            ) : bidComparison ? (
              <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="flex min-h-0 shrink-0 flex-col border-b bg-muted/20 lg:w-80 lg:border-b-0 lg:border-r">
                  <div className="grid shrink-0 grid-cols-3 gap-px border-b bg-border">
                    <div className="bg-background px-3 py-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Lowest
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold">
                        {bidComparison.statistics.lowestQuote != null
                          ? formatCurrency(bidComparison.statistics.lowestQuote)
                          : '-'}
                      </div>
                    </div>
                    <div className="bg-background px-3 py-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Average
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold">
                        {bidComparison.statistics.averageQuote != null
                          ? formatCurrency(bidComparison.statistics.averageQuote)
                          : '-'}
                      </div>
                    </div>
                    <div className="bg-background px-3 py-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Highest
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold">
                        {bidComparison.statistics.highestQuote != null
                          ? formatCurrency(bidComparison.statistics.highestQuote)
                          : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Vendors
                    </div>
                    <Badge variant="secondary" appearance="light" size="sm">
                      {comparisonRows.length}
                    </Badge>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    {comparisonRows.length > 0 ? (
                      <div className="space-y-2">
                        {comparisonRows.map((row) => {
                          const isSelected = row.vendorId === selectedCompareVendorId;
                          return (
                            <button
                              key={row.invite.id}
                              type="button"
                              className={`w-full rounded-lg border bg-background p-3 text-left transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-muted-foreground/30 hover:bg-muted/40'
                              }`}
                              onClick={() => {
                                setSelectedCompareVendorId(row.vendorId || null);
                                setActivePreviewDocId(null);
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">
                                    {row.vendorName}
                                  </div>
                                  {row.vendorEmail && (
                                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                      {row.vendorEmail}
                                    </div>
                                  )}
                                </div>
                                {row.isAwarded ? (
                                  <Badge variant="success" appearance="light" size="sm">
                                    Awarded
                                  </Badge>
                                ) : row.hasQuote ? (
                                  <Badge variant="primary" appearance="light" size="sm">
                                    Quoted
                                  </Badge>
                                ) : row.declined ? (
                                  <Badge variant="destructive" appearance="light" size="sm">
                                    Declined
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" appearance="light" size="sm">
                                    Waiting
                                  </Badge>
                                )}
                              </div>

                              {row.quote ? (
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  <span className="font-semibold text-foreground">
                                    {row.quote.grandTotal != null
                                      ? formatCurrency(row.quote.grandTotal)
                                      : 'No total'}
                                  </span>
                                  {row.quote.leadTimeDays != null && (
                                    <span>{row.quote.leadTimeDays} days lead</span>
                                  )}
                                  {row.quote.attachments && row.quote.attachments.length > 0 && (
                                    <span className="inline-flex items-center gap-1">
                                      <Paperclip className="size-3" />
                                      {row.quote.attachments.length}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-3 text-xs text-muted-foreground">
                                  {row.declined ? 'Declined to bid' : 'No quote submitted'}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
                        <Users className="mb-3 size-8 text-muted-foreground/40" />
                        No vendors invited.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col bg-background">
                  <div className="min-h-0 flex-1 bg-muted/20">
                    {!selectedComparisonRow ? (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <PanelRightOpen className="mb-4 size-10 text-muted-foreground/35" />
                        <p className="text-sm font-semibold">Select a vendor</p>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                          Choose a vendor to preview the quote document and compare bid details.
                        </p>
                      </div>
                    ) : selectedComparisonQuote && selectedPreviewAttachment ? (
                      <QuoteDocPreview
                        documentId={selectedPreviewAttachment.document.id}
                        name={selectedPreviewAttachment.document.name}
                        mimeType={selectedPreviewAttachment.document.mimeType}
                      />
                    ) : selectedComparisonQuote ? (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <FileText className="mb-4 size-12 text-muted-foreground/35" />
                        <p className="text-sm font-semibold">No document attached</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          The quote has pricing but no uploaded file.
                        </p>
                      </div>
                    ) : selectedComparisonRow.declined ? (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <XCircle className="mb-4 size-12 text-destructive/40" />
                        <p className="text-sm font-semibold text-destructive">Declined to bid</p>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <Clock className="mb-4 size-12 text-muted-foreground/35" />
                        <p className="text-sm font-semibold">Waiting for quote</p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 border-t bg-background px-5 py-4">
                    {selectedComparisonRow ? (
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold">
                              {selectedComparisonRow.vendorName}
                            </h3>
                            {selectedComparisonRow.isAwarded ? (
                              <Badge variant="success" appearance="light" size="sm">
                                Awarded
                              </Badge>
                            ) : selectedComparisonRow.hasQuote ? (
                              <Badge variant="primary" appearance="light" size="sm">
                                Quoted
                              </Badge>
                            ) : selectedComparisonRow.declined ? (
                              <Badge variant="destructive" appearance="light" size="sm">
                                Declined
                              </Badge>
                            ) : (
                              <Badge variant="secondary" appearance="light" size="sm">
                                Waiting
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                            <div>
                              <div className="text-xs font-semibold uppercase text-muted-foreground">
                                Quote Total
                              </div>
                              <div className="mt-1 font-medium">
                                {selectedComparisonQuote?.grandTotal != null
                                  ? formatCurrency(selectedComparisonQuote.grandTotal)
                                  : '-'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase text-muted-foreground">
                                Lead Time
                              </div>
                              <div className="mt-1 font-medium">
                                {selectedComparisonQuote?.leadTimeDays != null
                                  ? `${selectedComparisonQuote.leadTimeDays} days`
                                  : '-'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase text-muted-foreground">
                                Attachments
                              </div>
                              <div className="mt-1 font-medium">
                                {selectedComparisonAttachments.length}
                              </div>
                            </div>
                          </div>

                          {selectedComparisonAttachments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedComparisonAttachments.map((attachment) => {
                                const isActive =
                                  selectedPreviewAttachment?.id === attachment.id ||
                                  (!activePreviewDocId &&
                                    selectedComparisonAttachments[0]?.id === attachment.id);

                                return (
                                  <button
                                    key={attachment.id}
                                    type="button"
                                    className={`inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                      isActive
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'bg-background text-muted-foreground hover:bg-muted/50'
                                    }`}
                                    onClick={() => setActivePreviewDocId(attachment.id)}
                                  >
                                    <Paperclip className="size-3 shrink-0" />
                                    <span className="truncate">{attachment.document.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {selectedComparisonRow.isAwarded ? (
                            <Badge variant="success" appearance="light">
                              Awarded Bid
                            </Badge>
                          ) : canWorkflowRfq && selectedComparisonQuote ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setComparisonOpen(false);
                                setAwardQuoteIds([selectedComparisonQuote.quoteId]);
                                setAwardOpen(true);
                              }}
                            >
                              <Trophy className="size-4" />
                              Award Bid
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Select a vendor to see quote details.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                No comparison data available.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Upload / Edit Quotation dialog ---- */}
      <Dialog
        open={quoteOpen}
        onOpenChange={(open) => {
          if (!open) resetQuoteDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <DialogTitle>
                {isQuoteViewOnly
                  ? 'View Quotation'
                  : editingQuoteId
                    ? 'Edit Quotation'
                    : 'Upload Quotation'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                Quotation Amount
              </FieldLabel>
              <InputWrapper>
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  value={quoteAmount}
                  disabled={isQuoteViewOnly}
                  onChange={(e) =>
                    setQuoteAmount(e.target.value === '' ? '' : e.target.valueAsNumber)
                  }
                />
              </InputWrapper>
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                Lead Time (Days)
              </FieldLabel>
              <InputWrapper>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 30"
                  value={quoteLeadTime}
                  disabled={isQuoteViewOnly}
                  onChange={(e) => setQuoteLeadTime(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                  }}
                  autoComplete="off"
                />
              </InputWrapper>
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                Quote Document
              </FieldLabel>
              {!isQuoteViewOnly && (
                <FileDropZone
                  value={quoteFile}
                  onChange={setQuoteFile}
                  accept=".pdf,.xlsx,.docx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
              )}
            </Field>

            {existingAttachments.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-semibold tracking-normal uppercase text-muted-foreground">
                  Current Attachments
                </p>
                {existingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">
                        {att.document?.name || att.name || 'Document'}
                      </span>
                    </div>
                    {!isQuoteViewOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        mode="icon"
                        aria-label={`Remove ${att.document?.name || att.name || 'document'}`}
                        className="size-7 hover:text-destructive"
                        onClick={() =>
                          setExistingAttachments((prev) => prev.filter((a) => a.id !== att.id))
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                    {isQuoteViewOnly && (att.document || att.documentId) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        mode="icon"
                        aria-label={`Download ${att.document?.name || att.name || 'document'}`}
                        className="size-7"
                        onClick={() => {
                          const doc =
                            att.document ??
                            (att.documentId
                              ? { id: att.documentId, name: att.name ?? 'Document' }
                              : null);
                          if (doc) {
                            downloadFile.mutate(doc);
                          }
                        }}
                      >
                        <Upload className="size-4 rotate-180" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            {isQuoteViewOnly ? (
              <Button onClick={resetQuoteDialog}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={resetQuoteDialog}>
                  Cancel
                </Button>
                <Button
                  disabled={
                    !quoteAmount ||
                    quoteAmount <= 0 ||
                    submitQuoteMutation.isPending ||
                    updateQuoteMutation.isPending ||
                    uploadFileMutation.isPending
                  }
                  onClick={async () => {
                    if (!quoteAmount || quoteAmount <= 0) return;

                    try {
                      let fileIds: string[] = [];
                      if (quoteFile && rfqFolderQuery.data) {
                        const dotIdx = quoteFile.name.lastIndexOf('.');
                        const docName =
                          dotIdx > 0 ? quoteFile.name.slice(0, dotIdx) : quoteFile.name;
                        const fileItem = await uploadFileMutation.mutateAsync({
                          file: quoteFile,
                          data: {
                            name: docName,
                            parentId: rfqFolderQuery.data,
                            mimeType: quoteFile.type || undefined,
                            size: quoteFile.size,
                          },
                        });
                        fileIds = [fileItem.id];
                      }

                      const existingIds = existingAttachments.map((a) => a.documentId || a.id);
                      const allFileIds = [...existingIds, ...fileIds];

                      if (editingQuoteId) {
                        await updateQuoteMutation.mutateAsync({
                          rfqId,
                          data: {
                            id: quoteInviteId,
                            quotedAmount: quoteAmount,
                            leadTime: quoteLeadTime || undefined,
                            attachments: allFileIds,
                          },
                        });
                      } else {
                        await submitQuoteMutation.mutateAsync({
                          rfqId,
                          data: {
                            id: quoteInviteId,
                            quotedAmount: quoteAmount,
                            leadTime: quoteLeadTime || undefined,
                            attachments: allFileIds,
                          },
                        });
                      }
                      resetQuoteDialog();
                    } catch {
                      // errors handled by mutations
                    }
                  }}
                >
                  {submitQuoteMutation.isPending ||
                  updateQuoteMutation.isPending ||
                  uploadFileMutation.isPending
                    ? 'Uploading...'
                    : editingQuoteId
                      ? 'Save Changes'
                      : 'Upload Quote'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Invite vendors dialog ---- */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInviteOpen(false);
            setInviteVendorIds([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Vendors</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select additional vendors to invite to this RFQ.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 rounded-md border p-3">
              {vendors
                .filter((v) => !alreadyInvitedIds.has(v.id))
                .map((v) => (
                  <label
                    key={v.id}
                    className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer hover:bg-accent rounded px-1.5"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={inviteVendorIds.includes(v.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInviteVendorIds((prev) => [...prev, v.id]);
                        } else {
                          setInviteVendorIds((prev) => prev.filter((id) => id !== v.id));
                        }
                      }}
                    />
                    {v.name}
                  </label>
                ))}
              {vendors.filter((v) => !alreadyInvitedIds.has(v.id)).length === 0 && (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  All vendors have already been invited.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{inviteVendorIds.length} selected</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInviteOpen(false);
                setInviteVendorIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={inviteVendorIds.length === 0 || addVendorMutation.isPending}
              onClick={async () => {
                try {
                  await Promise.all(
                    inviteVendorIds.map((vendorId) =>
                      addVendorMutation.mutateAsync({ rfqId: rfqId!, vendorId })
                    )
                  );
                  setInviteOpen(false);
                  setInviteVendorIds([]);
                  toast.success('Vendors added successfully.');
                } catch {
                  // error toast already shown by mutation
                }
              }}
            >
              {addVendorMutation.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Publish dialog ---- */}
      <Dialog
        open={publishOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPublishOpen(false);
            setSelectedVendorIds([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select vendors to invite. The RFQ requires at least {rfq.minimumVendors ?? 3}{' '}
              vendor(s).
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 rounded-md border p-3">
              {vendors.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer hover:bg-accent rounded px-1.5"
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selectedVendorIds.includes(v.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVendorIds((prev) => [...prev, v.id]);
                      } else {
                        setSelectedVendorIds((prev) => prev.filter((id) => id !== v.id));
                      }
                    }}
                  />
                  {v.name}
                </label>
              ))}
              {vendors.length === 0 && (
                <p className="text-sm text-muted-foreground py-2 text-center">No vendors found.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedVendorIds.length} selected (min {rfq.minimumVendors ?? 3})
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPublishOpen(false);
                setSelectedVendorIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedVendorIds.length < (rfq.minimumVendors ?? 3) || isActionPending}
              onClick={async () => {
                try {
                  // 1. Publish first
                  await publishMutation.mutateAsync(rfqId!);

                  // 2. Then add vendors (only after published)
                  if (selectedVendorIds.length > 0) {
                    await Promise.all(
                      selectedVendorIds.map((vendorId) =>
                        addVendorMutation.mutateAsync({ rfqId: rfqId!, vendorId })
                      )
                    );
                  }

                  setPublishOpen(false);
                  setSelectedVendorIds([]);
                } catch {
                  // handled
                }
              }}
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish & Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Cancel RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Provide a reason for cancelling <strong>{rfq.rfqNumber ?? rfq.title}</strong>.
            </p>
            <Textarea
              placeholder="Cancellation reason..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelOpen(false);
                setCancelReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={cancelReason.length < 1 || isActionPending}
              onClick={() => {
                cancelMutation.mutate(
                  { id: rfqId, cancellationReason: cancelReason },
                  {
                    onSuccess: () => {
                      setCancelOpen(false);
                      setCancelReason('');
                    },
                  }
                );
              }}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel RFQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Void award dialog ---- */}
      <Dialog
        open={voidOpen}
        onOpenChange={(open) => {
          if (!open) {
            setVoidOpen(false);
            setVoidReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Award</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Provide a reason for voiding the award on{' '}
              <strong>{rfq.rfqNumber ?? rfq.title}</strong>.
            </p>
            <Textarea
              placeholder="Void reason..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVoidOpen(false);
                setVoidReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={voidReason.length < 1 || isActionPending}
              onClick={() => {
                voidMutation.mutate(
                  { id: rfqId, data: { voidReason } },
                  {
                    onSuccess: () => {
                      setVoidOpen(false);
                      setVoidReason('');
                    },
                  }
                );
              }}
            >
              {voidMutation.isPending ? 'Voiding...' : 'Void Award'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Award dialog ---- */}
      <Dialog
        open={awardOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAwardOpen(false);
            setAwardQuoteIds([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Award RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select one or more vendors to award this RFQ.
            </p>
            <div className="space-y-2">
              {quotes.map((q) => {
                const currentlyAwarded = !!q.isAwarded;
                const isSelected = awardQuoteIds.includes(q.id);
                return (
                  <label
                    key={q.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer hover:bg-accent ${currentlyAwarded ? 'border-success/50 bg-success/5' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={isSelected || currentlyAwarded}
                      disabled={currentlyAwarded}
                      onChange={() => {
                        setAwardQuoteIds((prev) =>
                          prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                        );
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{q.vendor?.name ?? 'Unknown Vendor'}</span>
                        {currentlyAwarded && (
                          <Badge variant="success" appearance="light" size="sm">
                            Awarded
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {q.grandTotal != null ? formatCurrency(q.grandTotal) : '—'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAwardOpen(false);
                setAwardQuoteIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={awardQuoteIds.length === 0 || isActionPending}
              onClick={async () => {
                for (const qId of awardQuoteIds) {
                  const selectedQuote = quotes.find((q) => q.id === qId);
                  if (!selectedQuote) continue;
                  try {
                    await awardMutation.mutateAsync({
                      rfqId,
                      quoteId: qId,
                    });
                  } catch {
                    break;
                  }
                }
                setAwardOpen(false);
                setAwardQuoteIds([]);
              }}
            >
              {awardMutation.isPending ? 'Processing...' : 'Award'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmation ---- */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete RFQ"
        description={
          <>
            This will permanently delete <strong>{rfq.rfqNumber ?? rfq.title}</strong>. This cannot
            be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          deleteMutation.mutate(rfqId, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />

      <RFQCreatePOPreviewDialog
        open={createPOOpen}
        rfqId={rfqId}
        projectId={projectId}
        onOpenChange={setCreatePOOpen}
      />
    </div>
  );
}
