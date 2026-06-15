import { useMemo, useRef, useState } from 'react';

import { DetailSidebar } from '@/app/components/detail-sidebar';
import { QueryErrorState } from '@/app/components/query-error-state';
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
import { Checkbox } from '@/app/components/ui/checkbox';
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
import { InfiniteMultiSearchSelect } from '@/app/components/ui/infinite-multi-search-select';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { Textarea } from '@/app/components/ui/textarea';
import { useAccess } from '@/app/contexts/access-context';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import type { GeneratedPdfFile } from '@/app/lib/generated-pdf';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { ActivityFeed, type ActivityItem } from '@/core/ui/components/sections/activity-feed';
import { useActivityLogQuery } from '@/modules/directory/hooks/activity.hooks';
import {
  useVendorPickerOptions,
  type VendorPickerOption,
} from '@/modules/directory/hooks/vendors/use-vendor-picker-options';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import {
  useDownloadFile,
  useFilePreviewQuery,
  useUploadFileMutation,
} from '@/modules/files/hooks/files.hooks';
import { useFeatureMailDraftQuery, useSendFeatureMailMutation } from '@/modules/mail/hooks';
import type { FeatureMailTarget } from '@/modules/mail/schemas/mail.schema';
import { usePdfNoticeConfigQuery, usePdfTermsConfigQuery } from '@/modules/pdf/hooks';
import type { GeneratePdfTermsInput } from '@/modules/pdf/schemas';
import {
  RFQDetailAttachmentsCard,
  RFQDetailDeliverablesCard,
  RFQDetailVendorsCard,
  RfqEmailWizardDialog,
} from '@/modules/project/components/rfq';
import {
  InfoRow,
  PdfGenerateDialog,
  ProjectDetailPageLoading,
} from '@/modules/project/components/shared';
import { getRfqStatusVariant, RFQ_TRACK_LABELS } from '@/modules/project/constants/rfq';
import { useProjectDetailQuery } from '@/modules/project/hooks';
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
  useSaveRFQVendorPdfMutation,
  useSubmitQuoteMutation,
  useUnawardRFQMutation,
  useChangeRFQStatusMutation as useUpdateRFQStatusMutation,
  useEditQuoteMutation as useUpdateVendorQuoteMutation,
} from '@/modules/project/hooks/rfq';
import {
  useProjectEntityFolderQuery,
  useProjectFolderQuery,
} from '@/modules/project/hooks/use-project-folder';
import { calculateRFQFinancialSummary } from '@/modules/project/lib/commercial-decimal';
import type { RFQQuoteAttachment, RFQStatus } from '@/modules/project/schemas/rfq';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
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

function hasHtmlText(value: string): boolean {
  return (
    value
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim().length > 0
  );
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email || null;
}

function resolveVendorPickerSelection(
  ids: string[],
  options: VendorPickerOption[],
  previousOptions: VendorPickerOption[]
) {
  return ids.map(
    (id) =>
      options.find((option) => option.value === id) ??
      previousOptions.find((option) => option.value === id) ?? {
        value: id,
        label: id,
      }
  );
}

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

  const { data: rfq, isLoading, isError, refetch: refetchRfqDetail } = useRFQDetailQuery(rfqId);
  const { data: project } = useProjectDetailQuery(projectId);
  useBreadcrumbLabel(
    projectId && rfqId ? `/app/project/${projectId}/rfqs/${rfqId}` : undefined,
    rfq?.rfqNumber ?? undefined
  );

  const publishMutation = usePublishRFQMutation();
  const cancelMutation = useCancelRFQMutation();
  const awardMutation = useAwardRFQMutation();
  const unawardMutation = useUnawardRFQMutation();
  const generateVendorPdfMutation = useGenerateRFQVendorPdfMutation();
  const saveVendorPdfMutation = useSaveRFQVendorPdfMutation();
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
  const rfqEntityFolderQuery = useProjectEntityFolderQuery(
    projectId,
    'RFQ',
    rfqId,
    project?.capabilities?.actions?.rfq?.update === true
  );
  const rfqUploadFolderId = rfqEntityFolderQuery.data ?? rfqFolderQuery.data;

  const { data: rfqStatuses } = useRFQStatusesQuery();
  const { data: rfqPdfTermsConfig } = usePdfTermsConfigQuery('rfq');
  const { data: rfqPdfNoticeConfig } = usePdfNoticeConfigQuery('rfq');
  const rfqPdfTermsOptions = useMemo(
    () => rfqPdfTermsConfig?.options ?? [],
    [rfqPdfTermsConfig?.options]
  );
  const rfqPdfNoticeOptions = useMemo(
    () => rfqPdfNoticeConfig?.options ?? [],
    [rfqPdfNoticeConfig?.options]
  );
  const defaultRfqPdfTermsOption = useMemo(
    () =>
      rfqPdfTermsOptions.find((option) => option.id === rfqPdfTermsConfig?.defaultOptionId) ??
      rfqPdfTermsOptions.find((option) => option.isDefault) ??
      rfqPdfTermsOptions[0],
    [rfqPdfTermsConfig?.defaultOptionId, rfqPdfTermsOptions]
  );
  const defaultRfqPdfNoticeOption = useMemo(
    () =>
      rfqPdfNoticeOptions.find((option) => option.id === rfqPdfNoticeConfig?.defaultOptionId) ??
      rfqPdfNoticeOptions.find((option) => option.isDefault) ??
      rfqPdfNoticeOptions[0],
    [rfqPdfNoticeConfig?.defaultOptionId, rfqPdfNoticeOptions]
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Publish dialog
  const [publishOpen, setPublishOpen] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [publishVendorSearch, setPublishVendorSearch] = useState('');
  const [publishSelectedVendorOptions, setPublishSelectedVendorOptions] = useState<
    VendorPickerOption[]
  >([]);

  // Invite vendors dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteVendorIds, setInviteVendorIds] = useState<string[]>([]);
  const [inviteVendorSearch, setInviteVendorSearch] = useState('');
  const [inviteSelectedVendorOptions, setInviteSelectedVendorOptions] = useState<
    VendorPickerOption[]
  >([]);

  // Upload / edit quotation dialog
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [, setQuoteVendorId] = useState<string>('');
  const [quoteInviteId, setQuoteInviteId] = useState<string>('');
  const [quoteAmount, setQuoteAmount] = useState<number | ''>('');
  const [quoteNegotiationAmount, setQuoteNegotiationAmount] = useState<number | ''>('');
  const [quoteVendorCoupon, setQuoteVendorCoupon] = useState(false);
  const [quoteLeadTime, setQuoteLeadTime] = useState('');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [isQuoteViewOnly, setIsQuoteViewOnly] = useState(false);
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<RFQQuoteAttachment[]>([]);
  const [quoteAttachmentPreviewFile, setQuoteAttachmentPreviewFile] =
    useState<FilePreviewItem | null>(null);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Award dialog
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardQuoteId, setAwardQuoteId] = useState('');
  const [awardNegotiationAmount, setAwardNegotiationAmount] = useState<number | ''>('');

  // Upload attachment dialog
  const [uploadOpen, setUploadOpen] = useState(false);

  // Bid comparison dialog
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selectedCompareVendorId, setSelectedCompareVendorId] = useState<string | null>(null);
  const [activePreviewDocId, setActivePreviewDocId] = useState<string | null>(null);

  // Generated PDF preview
  const [vendorPdfOptionsOpen, setVendorPdfOptionsOpen] = useState(false);
  const [vendorPdfPreview, setVendorPdfPreview] = useState<GeneratedPdfFile | null>(null);
  const [vendorPdfPreviewStale, setVendorPdfPreviewStale] = useState(false);
  const [vendorPdfTarget, setVendorPdfTarget] = useState<{
    quoteId: string;
    vendorName: string;
  } | null>(null);
  const [vendorPdfIncludeNotice, setVendorPdfIncludeNotice] = useState(false);
  const [vendorPdfNoticeTitle, setVendorPdfNoticeTitle] = useState('');
  const [vendorPdfNoticeHtml, setVendorPdfNoticeHtml] = useState('');
  const [vendorPdfNoticeTemplateId, setVendorPdfNoticeTemplateId] = useState('');
  const [vendorPdfDefaultNoticeApplied, setVendorPdfDefaultNoticeApplied] = useState(false);
  const [vendorPdfIncludeTerms, setVendorPdfIncludeTerms] = useState(false);
  const [vendorPdfTermsHtml, setVendorPdfTermsHtml] = useState('');
  const [vendorPdfTermsTemplateId, setVendorPdfTermsTemplateId] = useState('');
  const [vendorPdfDefaultTermsApplied, setVendorPdfDefaultTermsApplied] = useState(false);

  // Vendor email dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<FeatureMailTarget | null>(null);
  const vendorPdfRequestIdRef = useRef(0);

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

  const alreadyInvitedVendorIds = useMemo(
    () =>
      (rfq?.invites ?? [])
        .map((invite) => invite.vendor?.id ?? invite.vendorId)
        .filter((id): id is string => Boolean(id)),
    [rfq?.invites]
  );
  const publishVendorPicker = useVendorPickerOptions({
    search: publishVendorSearch,
    selectedOptions: publishSelectedVendorOptions,
    enabled: publishOpen,
    queryScope: 'rfq-publish-picker',
  });
  const inviteVendorPicker = useVendorPickerOptions({
    search: inviteVendorSearch,
    selectedOptions: inviteSelectedVendorOptions,
    excludedIds: alreadyInvitedVendorIds,
    enabled: inviteOpen,
    queryScope: 'rfq-invite-picker',
  });

  const statusObj = typeof rfq?.status === 'object' ? rfq.status : null;
  const statusName = statusObj?.name ?? (typeof rfq?.status === 'string' ? rfq.status : '');
  const isDraft = statusName === 'DRAFT';
  const isPublished = statusName === 'PUBLISHED';
  const isEvaluation = statusName === 'EVALUATION';
  const isAwarded = statusName === 'AWARDED';
  const isTerminal = statusName === 'CANCELLED' || statusName === 'VOID';
  const draftPublishedStatuses =
    rfqStatuses?.filter(
      (status): status is RFQStatus & { id: string; name: 'DRAFT' | 'PUBLISHED' } =>
        typeof status.id === 'string' &&
        status.id.length > 0 &&
        (status.name === 'DRAFT' || status.name === 'PUBLISHED')
    ) ?? [];
  const projectActions = project?.capabilities?.actions;
  const canEditDraftRfq = projectActions?.rfq?.update === true && isDraft;
  const canUploadRfqAttachment = projectActions?.rfq?.update === true && !isTerminal;
  const canManagePublishedRfq = projectActions?.rfq?.update === true && isPublished;
  const canStateRfq = projectActions?.rfq?.state === true;
  const canChangeDraftPublishedState = canStateRfq && (isDraft || isPublished);
  const canPublishRfq = projectActions?.rfq?.update === true && canStateRfq && isDraft;
  const canAwardRfq = projectActions?.rfq?.award === true && !isAwarded;
  const canUnawardRfq = projectActions?.rfq?.unaward === true;
  const canVoidRfq = projectActions?.rfq?.void === true && (isPublished || isAwarded);
  const canDeleteDraftRfq = projectActions?.rfq?.delete === true && isDraft;
  const canUseRfqActions = !isTerminal && (canVoidRfq || canDeleteDraftRfq);
  const canCreatePurchaseOrder = projectActions?.purchaseOrder?.create === true && isAwarded;
  const canEmailVendors = can('mail', 'send');
  const canSaveVendorPdf = projectActions?.rfq?.update === true;
  const hasQuoteAttachment =
    quoteVendorCoupon || existingAttachments.length > 0 || (!!quoteFile && !!rfqUploadFolderId);

  const isActionPending =
    publishMutation.isPending ||
    cancelMutation.isPending ||
    awardMutation.isPending ||
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

  if (isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load RFQ"
          description="The RFQ could not be loaded. Please try again."
          onRetry={() => void refetchRfqDetail()}
        />
      </div>
    );
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
  const comparisonSubtitle = rfq.rfqNumber ? `RFQ #${rfq.rfqNumber}` : rfq.title;

  const { deliverablesTotal, lowestQuote, highestQuote } = calculateRFQFinancialSummary({
    deliverables,
    quotes,
  });
  const hasFinancialSummary =
    deliverablesTotal > 0 ||
    lowestQuote != null ||
    highestQuote != null ||
    (isAwarded && (rfq.awardedAmount != null || !!rfq.awardedVendor));

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
      setQuoteNegotiationAmount(eq?.negotiationAmount ?? '');
      setQuoteVendorCoupon(eq?.vendorCoupon ?? false);
      // Use leadTimeDays if available (numeric), fallback to notes but strip non-numeric
      const lt = eq?.leadTimeDays?.toString() || eq?.notes?.replace(/[^0-9]/g, '') || '';
      setQuoteLeadTime(lt);
      setExistingAttachments(eq?.attachments ?? []);
    } else {
      setQuoteAmount('');
      setQuoteNegotiationAmount('');
      setQuoteVendorCoupon(false);
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
    setQuoteNegotiationAmount('');
    setQuoteVendorCoupon(false);
    setQuoteLeadTime('');
    setEditingQuoteId(null);
    setIsQuoteViewOnly(false);
    setQuoteFile(null);
    setExistingAttachments([]);
  }

  function handleAwardFromTable(quoteId: string) {
    const quote = quotes.find((item) => item.id === quoteId);
    setAwardQuoteId(quoteId);
    setAwardNegotiationAmount(quote?.negotiationAmount ?? quote?.grandTotal ?? quote?.totalAmount ?? '');
    setAwardOpen(true);
  }

  function handleUnaward() {
    unawardMutation.mutate(rfqId);
  }

  function resetVendorPdfState() {
    vendorPdfRequestIdRef.current += 1;
    setVendorPdfPreview(null);
    setVendorPdfPreviewStale(false);
    setVendorPdfTarget(null);
    setVendorPdfIncludeNotice(false);
    setVendorPdfNoticeTitle('');
    setVendorPdfNoticeHtml('');
    setVendorPdfNoticeTemplateId('');
    setVendorPdfDefaultNoticeApplied(false);
    setVendorPdfIncludeTerms(false);
    setVendorPdfTermsHtml('');
    setVendorPdfTermsTemplateId('');
    setVendorPdfDefaultTermsApplied(false);
  }

  function handleVendorPdfOptionsOpenChange(open: boolean) {
    setVendorPdfOptionsOpen(open);
    if (!open) {
      resetVendorPdfState();
    }
  }

  function applyDefaultVendorPdfTermsIfEmpty() {
    if (!defaultRfqPdfTermsOption?.html || hasHtmlText(vendorPdfTermsHtml)) return false;
    setVendorPdfTermsTemplateId(defaultRfqPdfTermsOption.id);
    setVendorPdfTermsHtml(defaultRfqPdfTermsOption.html);
    setVendorPdfDefaultTermsApplied(true);
    return true;
  }

  function applyDefaultVendorPdfNoticeIfEmpty() {
    if (!defaultRfqPdfNoticeOption?.html || hasHtmlText(vendorPdfNoticeHtml)) return false;
    setVendorPdfNoticeTemplateId(defaultRfqPdfNoticeOption.id);
    setVendorPdfNoticeTitle(defaultRfqPdfNoticeOption.title);
    setVendorPdfNoticeHtml(defaultRfqPdfNoticeOption.html);
    setVendorPdfDefaultNoticeApplied(true);
    return true;
  }

  function generateVendorPdfPreview(
    target: { quoteId: string; vendorName: string },
    data: GeneratePdfTermsInput,
    options: { openPdfDialog?: boolean } = {}
  ) {
    const { openPdfDialog = true } = options;
    const requestId = ++vendorPdfRequestIdRef.current;

    generateVendorPdfMutation
      .mutateAsync({ quoteId: target.quoteId, vendorName: target.vendorName, data })
      .then((file) => {
        if (requestId !== vendorPdfRequestIdRef.current) return;

        setVendorPdfPreview(file);
        setVendorPdfPreviewStale(false);
        if (openPdfDialog) {
          setVendorPdfOptionsOpen(true);
        }
      })
      .catch(() => {
        // The mutation hook shows the API error toast.
      });
  }

  function saveVendorPdfToFiles(
    target: { quoteId: string; vendorName: string },
    data: GeneratePdfTermsInput,
    options?: { openPdfDialog?: boolean }
  ) {
    const openPdfDialog = options?.openPdfDialog ?? true;
    saveVendorPdfMutation.mutate(
      { quoteId: target.quoteId, vendorName: target.vendorName, rfqId, data },
      {
        onSuccess: (file) => {
          setVendorPdfPreview(file);
          setVendorPdfPreviewStale(false);
          if (openPdfDialog) {
            setVendorPdfOptionsOpen(true);
          }
        },
      }
    );
  }

  function prepareVendorPdfTarget(target: { quoteId: string; vendorName: string }) {
    const shouldEnableDefaultNotice =
      !vendorPdfDefaultNoticeApplied && rfqPdfNoticeConfig?.includeByDefault === true;
    const shouldApplyDefaultNotice = shouldEnableDefaultNotice || vendorPdfIncludeNotice;
    const defaultNoticeApplied =
      shouldApplyDefaultNotice &&
      !vendorPdfDefaultNoticeApplied &&
      applyDefaultVendorPdfNoticeIfEmpty();
    const nextNoticeTitle =
      defaultNoticeApplied && defaultRfqPdfNoticeOption?.title
        ? defaultRfqPdfNoticeOption.title
        : vendorPdfNoticeTitle;
    const nextNoticeHtml =
      defaultNoticeApplied && defaultRfqPdfNoticeOption?.html
        ? defaultRfqPdfNoticeOption.html
        : vendorPdfNoticeHtml;
    const nextIncludeNotice =
      (shouldEnableDefaultNotice || vendorPdfIncludeNotice) && hasHtmlText(nextNoticeHtml);
    const shouldEnableDefaultTerms =
      !vendorPdfDefaultTermsApplied && rfqPdfTermsConfig?.includeByDefault === true;
    const shouldApplyDefaultTerms = shouldEnableDefaultTerms || vendorPdfIncludeTerms;
    const defaultTermsApplied =
      shouldApplyDefaultTerms &&
      !vendorPdfDefaultTermsApplied &&
      applyDefaultVendorPdfTermsIfEmpty();
    const nextTermsHtml =
      defaultTermsApplied && defaultRfqPdfTermsOption?.html
        ? defaultRfqPdfTermsOption.html
        : vendorPdfTermsHtml;
    const nextIncludeTerms =
      (shouldEnableDefaultTerms || vendorPdfIncludeTerms) && hasHtmlText(nextTermsHtml);

    setVendorPdfTarget(target);
    if (nextIncludeNotice) {
      setVendorPdfIncludeNotice(true);
    }
    if (nextIncludeTerms) {
      setVendorPdfIncludeTerms(true);
    }
    setVendorPdfPreview(null);
    setVendorPdfPreviewStale(false);

    return {
      addWarningNotice: nextIncludeNotice,
      warningNoticeTitle: nextIncludeNotice ? nextNoticeTitle : undefined,
      warningNoticeHtml: nextIncludeNotice ? nextNoticeHtml : undefined,
      addTermsAndConditions: nextIncludeTerms,
      termsAndConditionsHtml: nextIncludeTerms ? nextTermsHtml : undefined,
    };
  }

  function handleGenerateVendorPdf(inviteId: string, vendorName: string) {
    if (!deliverables.length) {
      toast.error('RFQ must have at least one deliverable to generate a PDF.');
      return;
    }
    const target = { quoteId: inviteId, vendorName };
    const request = prepareVendorPdfTarget(target);
    setVendorPdfOptionsOpen(true);
    generateVendorPdfPreview(target, request);
  }

  function markVendorPdfPreviewStale() {
    setVendorPdfPreviewStale((current) => current || vendorPdfPreview != null);
  }

  function handleVendorPdfIncludeNoticeChange(includeNotice: boolean) {
    if (includeNotice === vendorPdfIncludeNotice) return;
    markVendorPdfPreviewStale();
    setVendorPdfIncludeNotice(includeNotice);
    if (includeNotice) {
      applyDefaultVendorPdfNoticeIfEmpty();
    }
  }

  function handleVendorPdfNoticeTemplateChange(optionId: string) {
    const option = rfqPdfNoticeOptions.find((noticeOption) => noticeOption.id === optionId);
    if (!option || option.id === vendorPdfNoticeTemplateId) return;

    markVendorPdfPreviewStale();
    setVendorPdfNoticeTemplateId(option.id);
    setVendorPdfNoticeTitle(option.title);
    setVendorPdfNoticeHtml(option.html);
    setVendorPdfIncludeNotice(true);
    setVendorPdfDefaultNoticeApplied(true);
  }

  function handleVendorPdfNoticeTitleChange(value: string) {
    if (value === vendorPdfNoticeTitle) return;
    markVendorPdfPreviewStale();
    setVendorPdfNoticeTitle(value);
  }

  function handleVendorPdfNoticeHtmlChange(value: string) {
    if (value === vendorPdfNoticeHtml) return;
    markVendorPdfPreviewStale();
    setVendorPdfNoticeHtml(value);
  }

  function handleVendorPdfIncludeTermsChange(includeTerms: boolean) {
    if (includeTerms === vendorPdfIncludeTerms) return;
    markVendorPdfPreviewStale();
    setVendorPdfIncludeTerms(includeTerms);
    if (includeTerms) {
      applyDefaultVendorPdfTermsIfEmpty();
    }
  }

  function handleVendorPdfTermsTemplateChange(optionId: string) {
    const option = rfqPdfTermsOptions.find((termsOption) => termsOption.id === optionId);
    if (!option || option.id === vendorPdfTermsTemplateId) return;

    markVendorPdfPreviewStale();
    setVendorPdfTermsTemplateId(option.id);
    setVendorPdfTermsHtml(option.html);
    setVendorPdfIncludeTerms(true);
    setVendorPdfDefaultTermsApplied(true);
  }

  function handleVendorPdfTermsHtmlChange(value: string) {
    if (value === vendorPdfTermsHtml) return;
    markVendorPdfPreviewStale();
    setVendorPdfTermsHtml(value);
  }

  function getVendorPdfTargetFromInvite(inviteId: string) {
    const invite = invites.find((item) => item.id === inviteId);
    if (!invite) return null;

    return {
      quoteId: invite.id,
      vendorName: invite.vendor?.name ?? 'Vendor',
      vendorEmail: invite.vendor?.email ?? null,
    };
  }

  function getInviteRecipientEmails(invite: (typeof invites)[number]): string[] {
    const vendorEmail = normalizeEmail(invite.vendor?.email);
    const contactEmails =
      invite.vendor?.contacts?.flatMap((contact) => {
        const email = normalizeEmail(contact.email);
        return email ? [email] : [];
      }) ?? [];

    return [...new Set([...(vendorEmail ? [vendorEmail] : []), ...contactEmails])];
  }

  function openRfqEmailFlow(
    target: FeatureMailTarget,
    pdfTarget: { quoteId: string; vendorName: string }
  ) {
    if (!deliverables.length) {
      toast.error('RFQ must have at least one deliverable to generate a PDF.');
      return;
    }
    const request = prepareVendorPdfTarget(pdfTarget);
    setEmailTarget(target);
    sendVendorEmailMutation.reset();
    setEmailOpen(true);
    generateVendorPdfPreview(pdfTarget, request, { openPdfDialog: false });
  }

  function handleEmailVendor(inviteId: string) {
    const invite = invites.find((item) => item.id === inviteId);
    const pdfTarget = getVendorPdfTargetFromInvite(inviteId);
    if (!pdfTarget || !invite) return;

    if (getInviteRecipientEmails(invite).length === 0) {
      toast.error(`${pdfTarget.vendorName} does not have a vendor or linked contact email.`);
      return;
    }

    if (!normalizeEmail(pdfTarget.vendorEmail)) {
      toast.info(
        `${pdfTarget.vendorName} does not have a vendor email. Select a contact recipient.`
      );
    }

    openRfqEmailFlow(
      { feature: 'rfq.vendorRequest', entityId: inviteId },
      { quoteId: pdfTarget.quoteId, vendorName: pdfTarget.vendorName }
    );
  }

  function handleEmailAllVendors() {
    const previewInvite =
      invites.find((invite) => getInviteRecipientEmails(invite).length > 0) ?? invites[0];
    if (!previewInvite) return;

    const missingEmailVendors = invites
      .filter((invite) => !normalizeEmail(invite.vendor?.email))
      .map((invite) => invite.vendor?.name ?? 'Unknown vendor');
    const unavailableRecipientVendors = invites
      .filter((invite) => getInviteRecipientEmails(invite).length === 0)
      .map((invite) => invite.vendor?.name ?? 'Unknown vendor');

    if (missingEmailVendors.length > 0) {
      toast.info(`Vendor email missing for: ${missingEmailVendors.join(', ')}`);
    }

    if (unavailableRecipientVendors.length > 0) {
      toast.error(
        `No vendor or contact email available for: ${unavailableRecipientVendors.join(', ')}`
      );
    }

    openRfqEmailFlow(
      { feature: 'rfq.vendorRequestAll', entityId: rfqId },
      { quoteId: previewInvite.id, vendorName: previewInvite.vendor?.name ?? 'Vendor' }
    );
  }

  function handleCreatePurchaseOrder() {
    navigate(`/app/project/${projectId}/purchase-orders/create?rfqId=${rfqId}`);
  }

  function handleEmailOpenChange(open: boolean) {
    setEmailOpen(open);
    if (!open) {
      setEmailTarget(null);
      sendVendorEmailMutation.reset();
      resetVendorPdfState();
    }
  }

  return (
    <div className="container-fluid max-w-full overflow-x-hidden px-4 pb-5 sm:px-6 lg:px-7.5">
      {vendorPdfOptionsOpen && vendorPdfTarget && (
        <PdfGenerateDialog
          open={vendorPdfOptionsOpen}
          title={`Generate RFQ PDF - ${vendorPdfTarget.vendorName}`}
          onOpenChange={handleVendorPdfOptionsOpenChange}
          includeNotice={vendorPdfIncludeNotice}
          noticeTitle={vendorPdfNoticeTitle}
          noticeHtml={vendorPdfNoticeHtml}
          noticeOptions={rfqPdfNoticeOptions}
          selectedNoticeOptionId={vendorPdfNoticeTemplateId}
          includeTerms={vendorPdfIncludeTerms}
          termsHtml={vendorPdfTermsHtml}
          termsOptions={rfqPdfTermsOptions}
          selectedTermsOptionId={vendorPdfTermsTemplateId}
          previewFile={vendorPdfPreview}
          isPreviewStale={vendorPdfPreviewStale}
          isGenerating={generateVendorPdfMutation.isPending}
          isSaving={saveVendorPdfMutation.isPending}
          canSave={canSaveVendorPdf}
          onIncludeNoticeChange={handleVendorPdfIncludeNoticeChange}
          onNoticeOptionChange={handleVendorPdfNoticeTemplateChange}
          onNoticeTitleChange={handleVendorPdfNoticeTitleChange}
          onNoticeHtmlChange={handleVendorPdfNoticeHtmlChange}
          onIncludeTermsChange={handleVendorPdfIncludeTermsChange}
          onTermsOptionChange={handleVendorPdfTermsTemplateChange}
          onTermsHtmlChange={handleVendorPdfTermsHtmlChange}
          onGenerate={(data) => generateVendorPdfPreview(vendorPdfTarget, data)}
          onSave={(data) => saveVendorPdfToFiles(vendorPdfTarget, data)}
        />
      )}
      <RfqEmailWizardDialog
        open={emailOpen}
        onOpenChange={handleEmailOpenChange}
        title={emailTarget?.feature === 'rfq.vendorRequestAll' ? 'Email All Vendors' : 'Email RFQ'}
        pdfTitle={
          vendorPdfTarget
            ? `${rfq.rfqNumber ?? 'RFQ'} - ${vendorPdfTarget.vendorName}`
            : (rfq.rfqNumber ?? 'RFQ')
        }
        draft={vendorEmailDraftQuery.data ?? null}
        isDraftLoading={vendorEmailDraftQuery.isLoading}
        isGenerating={generateVendorPdfMutation.isPending}
        isSaving={saveVendorPdfMutation.isPending}
        isSending={sendVendorEmailMutation.isPending}
        canSavePdf={canSaveVendorPdf}
        pdfPreviewFile={vendorPdfPreview}
        isPdfPreviewStale={vendorPdfPreviewStale}
        includeNotice={vendorPdfIncludeNotice}
        noticeTitle={vendorPdfNoticeTitle}
        noticeHtml={vendorPdfNoticeHtml}
        noticeOptions={rfqPdfNoticeOptions}
        selectedNoticeOptionId={vendorPdfNoticeTemplateId}
        includeTerms={vendorPdfIncludeTerms}
        termsHtml={vendorPdfTermsHtml}
        termsOptions={rfqPdfTermsOptions}
        selectedTermsOptionId={vendorPdfTermsTemplateId}
        onIncludeNoticeChange={handleVendorPdfIncludeNoticeChange}
        onNoticeOptionChange={handleVendorPdfNoticeTemplateChange}
        onNoticeTitleChange={handleVendorPdfNoticeTitleChange}
        onNoticeHtmlChange={handleVendorPdfNoticeHtmlChange}
        onIncludeTermsChange={handleVendorPdfIncludeTermsChange}
        onTermsOptionChange={handleVendorPdfTermsTemplateChange}
        onTermsHtmlChange={handleVendorPdfTermsHtmlChange}
        onGeneratePdf={(data) => {
          if (!vendorPdfTarget) return;
          generateVendorPdfPreview(vendorPdfTarget, data, { openPdfDialog: false });
        }}
        onSavePdf={(data) => {
          if (!vendorPdfTarget) return;
          saveVendorPdfToFiles(vendorPdfTarget, data, { openPdfDialog: false });
        }}
        onSend={async (payload, pdfOptions) => {
          if (!emailTarget) return;
          await sendVendorEmailMutation.mutateAsync({
            feature: emailTarget.feature,
            entityId: emailTarget.entityId,
            draft: payload,
            pdfOptions,
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
              {rfq.status && canChangeDraftPublishedState && draftPublishedStatuses.length > 0 ? (
                <Select
                  disabled={updateStatusMutation.isPending}
                  value={statusObj?.id || (typeof rfq.status === 'string' ? rfq.status : '')}
                  onValueChange={(statusId) => {
                    if (statusId !== (statusObj?.id || rfq.status)) {
                      const selectedStatus = draftPublishedStatuses.find(
                        (status) => status.id === statusId
                      );
                      if (selectedStatus) {
                        updateStatusMutation.mutate({
                          id: rfqId,
                          statusName: selectedStatus.name,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-8 min-w-24 bg-transparent border-none p-0 focus:ring-0">
                    <Badge variant={getRfqStatusVariant(statusName)} appearance="light" size="sm">
                      {statusObj?.label || statusName}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {draftPublishedStatuses.map((status) => (
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
            {canPublishRfq && (
              <Button size="sm" onClick={() => setPublishOpen(true)}>
                <Send className="size-4" />
                Publish
              </Button>
            )}
            {canAwardRfq && (isPublished || isEvaluation) && quotes.length > 0 && (
              <Button size="sm" onClick={() => setAwardOpen(true)}>
                <Trophy className="size-4" />
                Award
              </Button>
            )}

            {canUseRfqActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {canVoidRfq && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setCancelReason('');
                        setCancelOpen(true);
                      }}
                    >
                      Void RFQ
                    </DropdownMenuItem>
                  )}
                  {canDeleteDraftRfq && (
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
          <StatsBar variant="cards" width="full" columns={{ sm: 2, xl: 3 }}>
            <StatsBarItem
              variant="card"
              label="Vendors Invited"
              value={invites.length}
              description="Total invited"
              dotColor="bg-primary"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Quotes Received"
              value={quotes.length}
              description="Active bids"
              dotColor="bg-success"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Lowest Quote"
              value={lowestQuote != null ? formatCurrency(lowestQuote) : '—'}
              description={lowestQuote != null ? 'Lowest current bid' : 'No quotes yet'}
              dotColor="bg-warning"
              valueColor="text-foreground"
            />
          </StatsBar>

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
            canAwardQuotes={canAwardRfq}
            canUnawardQuotes={canUnawardRfq}
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
            onGeneratePO={handleCreatePurchaseOrder}
            onRemoveQuote={(quoteId) => removeQuoteMutation.mutate({ rfqId, id: quoteId })}
            onRemoveVendor={(inviteId) => removeVendorMutation.mutate({ rfqId, quoteId: inviteId })}
            onDeclineInvite={(inviteId) =>
              declineInviteMutation.mutate({ rfqId, data: { id: inviteId } })
            }
            isGeneratingVendorPdf={generateVendorPdfMutation.isPending}
          />

          <RFQDetailAttachmentsCard
            attachments={attachments}
            canUpload={canUploadRfqAttachment && !!rfqUploadFolderId}
            canRemove={canEditDraftRfq}
            isRemoving={removeAttachmentMutation.isPending}
            onUpload={() => setUploadOpen(true)}
            onRemove={(attachmentId) => {
              removeAttachmentMutation.mutate({
                rfqId,
                attachmentId,
              });
            }}
          />

          {canUploadRfqAttachment && rfqUploadFolderId && (
            <UploadFileDialog
              open={uploadOpen}
              onOpenChange={setUploadOpen}
              parentId={rfqUploadFolderId}
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

            {hasFinancialSummary && (
              <div>
                <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-3">
                  Financial Summary
                </div>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    {deliverablesTotal > 0 && (
                      <InfoRow label="Est. Deliverables">
                        {formatCurrency(deliverablesTotal)}
                      </InfoRow>
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
            )}

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
            {isComparisonLoading ? (
              <>
                <div className="flex shrink-0 items-start gap-3 border-b bg-background px-4 py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    mode="icon"
                    aria-label="Close bid comparison"
                    className="mt-0.5 size-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setComparisonOpen(false)}
                  >
                    <X className="size-4" />
                  </Button>

                  <div className="min-w-0">
                    <DialogTitle className="text-xl">Bid Comparison</DialogTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{comparisonSubtitle}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                  <div className="mb-4 size-8 animate-spin rounded-full border-2 border-muted-foreground/10 border-t-primary" />
                  <p className="text-sm">Loading comparison...</p>
                </div>
              </>
            ) : isComparisonError ? (
              <>
                <div className="flex shrink-0 items-start gap-3 border-b bg-background px-4 py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    mode="icon"
                    aria-label="Close bid comparison"
                    className="mt-0.5 size-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setComparisonOpen(false)}
                  >
                    <X className="size-4" />
                  </Button>

                  <div className="min-w-0">
                    <DialogTitle className="text-xl">Bid Comparison</DialogTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{comparisonSubtitle}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <ShieldAlert className="mb-4 size-10 text-destructive/50" />
                  <p className="text-sm font-medium text-destructive">
                    Failed to load comparison data.
                  </p>
                </div>
              </>
            ) : bidComparison ? (
              <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="flex min-h-0 shrink-0 flex-col border-b bg-muted/20 lg:w-80 lg:border-b-0 lg:border-r">
                  <div className="flex shrink-0 items-start gap-3 border-b bg-background px-4 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      mode="icon"
                      aria-label="Close bid comparison"
                      className="mt-0.5 size-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setComparisonOpen(false)}
                    >
                      <X className="size-4" />
                    </Button>

                    <div className="min-w-0">
                      <DialogTitle className="text-xl">Bid Comparison</DialogTitle>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {comparisonSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 border-b bg-background px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Vendors
                      </div>
                      <Badge variant="secondary" appearance="light" size="sm">
                        {bidComparison.statistics.quotesSubmitted}/
                        {bidComparison.statistics.quotesExpected} submitted
                      </Badge>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      Range:{' '}
                      <span className="font-medium text-foreground">
                        {bidComparison.statistics.lowestQuote != null &&
                        bidComparison.statistics.highestQuote != null
                          ? `${formatCurrency(bidComparison.statistics.lowestQuote)} - ${formatCurrency(
                              bidComparison.statistics.highestQuote
                            )}`
                          : 'No quotes'}
                      </span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    {comparisonRows.length > 0 ? (
                      <div className="space-y-2">
                        {comparisonRows.map((row) => {
                          const isSelected = row.vendorId === selectedCompareVendorId;
                          const comparisonQuote = row.quote;
                          const comparisonAttachments = comparisonQuote?.attachments ?? [];
                          const canAwardComparisonRow =
                            canAwardRfq && isSelected && !!comparisonQuote && !row.isAwarded;

                          const selectComparisonRow = () => {
                            setSelectedCompareVendorId(row.vendorId || null);
                            setActivePreviewDocId(null);
                          };

                          return (
                            <div
                              key={row.invite.id}
                              className={`w-full rounded-lg border bg-background p-3 text-left transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-muted-foreground/30 hover:bg-muted/40'
                              }`}
                            >
                              <button
                                type="button"
                                className="w-full cursor-pointer text-left"
                                onClick={selectComparisonRow}
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

                                {comparisonQuote ? (
                                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">
                                      {comparisonQuote.grandTotal != null
                                        ? formatCurrency(comparisonQuote.grandTotal)
                                        : 'No total'}
                                    </span>
                                    {comparisonQuote.leadTimeDays != null && (
                                      <span>{comparisonQuote.leadTimeDays} days lead</span>
                                    )}
                                    {comparisonAttachments.length > 0 && (
                                      <span className="inline-flex items-center gap-1">
                                        <Paperclip className="size-3" />
                                        {comparisonAttachments.length}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-3 text-xs text-muted-foreground">
                                    {row.declined ? 'Declined to bid' : 'No quote submitted'}
                                  </div>
                                )}
                              </button>

                              {isSelected && comparisonAttachments.length > 1 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {comparisonAttachments.map((attachment) => {
                                    const isActive =
                                      selectedPreviewAttachment?.id === attachment.id ||
                                      (!activePreviewDocId &&
                                        comparisonAttachments[0]?.id === attachment.id);

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

                              {canAwardComparisonRow && comparisonQuote && (
                                <Button
                                  size="sm"
                                  className="mt-3 w-full"
                                  onClick={() => {
                                    handleAwardFromTable(comparisonQuote.quoteId);
                                  }}
                                >
                                  <Trophy className="size-4" />
                                  Award Bid
                                </Button>
                              )}
                            </div>
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

                  <details className="group shrink-0 border-t bg-background px-4 py-3 text-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase text-muted-foreground">
                      RFQ Details
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </summary>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Issue</div>
                        <div className="mt-0.5 font-medium">
                          {rfq.createdAt ? formatDate(rfq.createdAt) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Due</div>
                        <div className="mt-0.5 font-medium">
                          {formatDate(rfq.bidDeadline || '')}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Lowest</div>
                        <div className="mt-0.5 font-medium">
                          {bidComparison.statistics.lowestQuote != null
                            ? formatCurrency(bidComparison.statistics.lowestQuote)
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Average</div>
                        <div className="mt-0.5 font-medium">
                          {bidComparison.statistics.averageQuote != null
                            ? formatCurrency(bidComparison.statistics.averageQuote)
                            : '-'}
                        </div>
                      </div>
                    </div>
                  </details>
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
                </div>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-start gap-3 border-b bg-background px-4 py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    mode="icon"
                    aria-label="Close bid comparison"
                    className="mt-0.5 size-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setComparisonOpen(false)}
                  >
                    <X className="size-4" />
                  </Button>

                  <div className="min-w-0">
                    <DialogTitle className="text-xl">Bid Comparison</DialogTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{comparisonSubtitle}</p>
                  </div>
                </div>
                <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  No comparison data available.
                </div>
              </>
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
                <NumberInput
                  value={typeof quoteAmount === 'number' ? quoteAmount : 0}
                  onValueChange={setQuoteAmount}
                  min={0}
                  decimalPlaces={2}
                  placeholder="0.00"
                  disabled={isQuoteViewOnly}
                />
              </InputWrapper>
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                Negotiation Amount
              </FieldLabel>
              <InputWrapper>
                <span className="text-muted-foreground text-sm">$</span>
                <NumberInput
                  value={typeof quoteNegotiationAmount === 'number' ? quoteNegotiationAmount : 0}
                  onValueChange={setQuoteNegotiationAmount}
                  min={0}
                  decimalPlaces={2}
                  placeholder="0.00"
                  disabled={isQuoteViewOnly}
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

            <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm">
              <Checkbox
                checked={quoteVendorCoupon}
                disabled={isQuoteViewOnly}
                onCheckedChange={(checked) => setQuoteVendorCoupon(checked === true)}
              />
              <span className="min-w-0 font-medium text-foreground">Vendor Coupon</span>
            </label>

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
                      {att.document || att.documentId ? (
                        <button
                          type="button"
                          className="truncate text-left text-sm font-medium text-primary hover:underline"
                          onClick={() => {
                            const doc =
                              att.document ??
                              (att.documentId
                                ? { id: att.documentId, name: att.name ?? 'Document' }
                                : null);
                            if (doc) {
                              setQuoteAttachmentPreviewFile({ id: doc.id, name: doc.name });
                            }
                          }}
                        >
                          {att.document?.name || att.name || 'Document'}
                        </button>
                      ) : (
                        <span className="text-sm truncate">{att.name || 'Document'}</span>
                      )}
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
                    !hasQuoteAttachment ||
                    submitQuoteMutation.isPending ||
                    updateQuoteMutation.isPending ||
                    uploadFileMutation.isPending
                  }
                  onClick={async () => {
                    if (!quoteAmount || quoteAmount <= 0) return;
                    if (!hasQuoteAttachment) return;

                    try {
                      let fileIds: string[] = [];
                      if (quoteFile && rfqUploadFolderId) {
                        const dotIdx = quoteFile.name.lastIndexOf('.');
                        const docName =
                          dotIdx > 0 ? quoteFile.name.slice(0, dotIdx) : quoteFile.name;
                        const fileItem = await uploadFileMutation.mutateAsync({
                          file: quoteFile,
                          data: {
                            name: docName,
                            parentId: rfqUploadFolderId,
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
                            negotiationAmount:
                              typeof quoteNegotiationAmount === 'number' &&
                              quoteNegotiationAmount > 0
                                ? quoteNegotiationAmount
                                : null,
                            vendorCoupon: quoteVendorCoupon,
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
                            negotiationAmount:
                              typeof quoteNegotiationAmount === 'number' &&
                              quoteNegotiationAmount > 0
                                ? quoteNegotiationAmount
                                : null,
                            vendorCoupon: quoteVendorCoupon,
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
            setInviteVendorSearch('');
            setInviteSelectedVendorOptions([]);
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
            <InfiniteMultiSearchSelect
              options={inviteVendorPicker.options}
              value={inviteVendorIds}
              onValueChange={(nextIds) => {
                setInviteVendorIds(nextIds);
                setInviteSelectedVendorOptions((previous) =>
                  resolveVendorPickerSelection(nextIds, inviteVendorPicker.options, previous)
                );
              }}
              search={inviteVendorSearch}
              onSearchChange={setInviteVendorSearch}
              isLoading={inviteVendorPicker.isLoading}
              isFetchingNextPage={inviteVendorPicker.isFetchingNextPage}
              hasNextPage={inviteVendorPicker.hasNextPage}
              onFetchNextPage={inviteVendorPicker.fetchNextPage}
              placeholder="Select vendors..."
              searchPlaceholder="Search vendors..."
              emptyMessage={
                inviteVendorSearch ? 'No matching vendors found.' : 'No vendors available to invite.'
              }
              loadingMessage="Loading vendors..."
              testId="rfq-invite-vendors-select"
            />
            <p className="text-xs text-muted-foreground">{inviteVendorIds.length} selected</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInviteOpen(false);
                setInviteVendorIds([]);
                setInviteVendorSearch('');
                setInviteSelectedVendorOptions([]);
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
                      addVendorMutation.mutateAsync({ rfqId: rfqId!, vendorId, silent: true })
                    )
                  );
                  setInviteOpen(false);
                  setInviteVendorIds([]);
                  setInviteVendorSearch('');
                  setInviteSelectedVendorOptions([]);
                  toast.success(inviteVendorIds.length === 1 ? 'Vendor added.' : 'Vendors added.');
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
            setPublishVendorSearch('');
            setPublishSelectedVendorOptions([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select vendors to invite. The RFQ requires at least {rfq.minimumVendors ?? 1}{' '}
              vendor(s).
            </p>
            <InfiniteMultiSearchSelect
              options={publishVendorPicker.options}
              value={selectedVendorIds}
              onValueChange={(nextIds) => {
                setSelectedVendorIds(nextIds);
                setPublishSelectedVendorOptions((previous) =>
                  resolveVendorPickerSelection(nextIds, publishVendorPicker.options, previous)
                );
              }}
              search={publishVendorSearch}
              onSearchChange={setPublishVendorSearch}
              isLoading={publishVendorPicker.isLoading}
              isFetchingNextPage={publishVendorPicker.isFetchingNextPage}
              hasNextPage={publishVendorPicker.hasNextPage}
              onFetchNextPage={publishVendorPicker.fetchNextPage}
              placeholder="Select vendors..."
              searchPlaceholder="Search vendors..."
              emptyMessage={
                publishVendorSearch ? 'No matching vendors found.' : 'No vendors found.'
              }
              loadingMessage="Loading vendors..."
              testId="rfq-publish-vendors-select"
            />
            <p className="text-xs text-muted-foreground">
              {selectedVendorIds.length} selected (min {rfq.minimumVendors ?? 1})
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPublishOpen(false);
                setSelectedVendorIds([]);
                setPublishVendorSearch('');
                setPublishSelectedVendorOptions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedVendorIds.length < (rfq.minimumVendors ?? 1) || isActionPending}
              onClick={async () => {
                try {
                  // 1. Publish first
                  await publishMutation.mutateAsync(rfqId!);

                  // 2. Then add vendors (only after published)
                  if (selectedVendorIds.length > 0) {
                    await Promise.all(
                      selectedVendorIds.map((vendorId) =>
                        addVendorMutation.mutateAsync({ rfqId: rfqId!, vendorId, silent: true })
                      )
                    );
                  }

                  setPublishOpen(false);
                  setSelectedVendorIds([]);
                  setPublishVendorSearch('');
                  setPublishSelectedVendorOptions([]);
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

      {/* ---- Void dialog ---- */}
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
            <DialogTitle>Void RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Provide a reason for voiding <strong>{rfq.rfqNumber ?? rfq.title}</strong>.
            </p>
            <Textarea
              placeholder="Void reason..."
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
              {cancelMutation.isPending ? 'Voiding...' : 'Void RFQ'}
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
            setAwardQuoteId('');
            setAwardNegotiationAmount('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Award RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select one vendor to award this RFQ.
            </p>
            <RadioGroup
              value={awardQuoteId}
              onValueChange={(quoteId) => {
                const quote = quotes.find((item) => item.id === quoteId);
                setAwardQuoteId(quoteId);
                setAwardNegotiationAmount(
                  quote?.negotiationAmount ?? quote?.grandTotal ?? quote?.totalAmount ?? ''
                );
              }}
              className="space-y-2"
            >
              {quotes.map((q) => {
                const currentlyAwarded = !!q.isAwarded;
                return (
                  <label
                    key={q.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer hover:bg-accent ${currentlyAwarded ? 'border-success/50 bg-success/5' : ''}`}
                  >
                    <RadioGroupItem value={q.id} disabled={currentlyAwarded} />
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
            </RadioGroup>

            <Field>
              <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                Negotiation Amount
              </FieldLabel>
              <InputWrapper>
                <span className="text-muted-foreground text-sm">$</span>
                <NumberInput
                  value={typeof awardNegotiationAmount === 'number' ? awardNegotiationAmount : 0}
                  onValueChange={setAwardNegotiationAmount}
                  min={0}
                  decimalPlaces={2}
                  placeholder="0.00"
                />
              </InputWrapper>
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAwardOpen(false);
                setAwardQuoteId('');
                setAwardNegotiationAmount('');
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!awardQuoteId || isActionPending}
              onClick={async () => {
                const selectedQuote = quotes.find((q) => q.id === awardQuoteId);
                if (!selectedQuote) return;
                try {
                  await awardMutation.mutateAsync({
                    rfqId,
                    quoteId: awardQuoteId,
                    negotiationAmount:
                      typeof awardNegotiationAmount === 'number' && awardNegotiationAmount > 0
                        ? awardNegotiationAmount
                        : null,
                  });
                } catch {
                  return;
                }
                setAwardOpen(false);
                setAwardQuoteId('');
                setAwardNegotiationAmount('');
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
            This will delete <strong>{rfq.rfqNumber ?? rfq.title}</strong>.
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

      <FilePreviewDialog
        open={!!quoteAttachmentPreviewFile}
        onOpenChange={(open) => {
          if (!open) setQuoteAttachmentPreviewFile(null);
        }}
        file={quoteAttachmentPreviewFile}
      />
    </div>
  );
}
