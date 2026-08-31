import { StatusBadge } from '@/app/components/status-badge';
import { useMemo, useState } from 'react';

import { DetailSidebar } from '@/app/components/detail-sidebar';
import { DetailTable } from '@/app/components/detail-table';
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
import { Separator } from '@/app/components/ui/separator';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { Textarea } from '@/app/components/ui/textarea';
import { useAccess } from '@/app/contexts/access-context';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { useResponsiveDetailSidebar } from '@/app/hooks/use-responsive-detail-sidebar';
import type { GeneratedPdfFile } from '@/app/lib/generated-pdf';
import { formatCurrency, formatDate, formatDecimal } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useDownloadFile } from '@/modules/files/hooks/files.hooks';
import { useUploadManager } from '@/modules/files/uploads/upload-manager';
import { useFeatureMailDraftQuery, useSendFeatureMailMutation } from '@/modules/mail/hooks';
import type { FeatureMailTarget } from '@/modules/mail/schemas/mail.schema';
import { usePdfNoticeConfigQuery, usePdfTermsConfigQuery } from '@/modules/pdf/hooks';
import {
  calculateEffectivePurchaseOrderTotals,
  calculateRoundedLineAmount,
  formatPurchaseOrderTaxLabel,
  type PurchaseOrderLineAmountLike,
} from '@/modules/project/components/purchase-order/purchase-order-totals';
import {
  DocumentEmailWizardDialog,
  FeatureEmailSentBadge,
  InfoRow,
  PdfGenerateDialog,
  ProjectActivityPanel,
  ProjectDetailPageLoading,
} from '@/modules/project/components/shared';
import { useProjectCostCodesQuery, useProjectDetailQuery } from '@/modules/project/hooks';
import { usePODetailQuery } from '@/modules/project/hooks/purchase-order';
import {
  useAddSCOAttachmentMutation,
  useApproveSCOMutation,
  useGenerateSCOPdfMutation,
  useRejectSCOMutation,
  useRemoveSCOAttachmentMutation,
  useSaveSCOPdfMutation,
  useSCODetailQuery,
  useVoidSCOMutation,
} from '@/modules/project/hooks/sub-change-order';
import {
  useProjectEntityFolderQuery,
  useProjectFolderQuery,
} from '@/modules/project/hooks/use-project-folder';
import type { GenerateSCOPdfInput } from '@/modules/project/schemas/sub-change-order';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Mail,
  PanelRightOpen,
  Pencil,
  ShieldAlert,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

/* eslint-disable react-refresh/only-export-components -- constant workflow definition used by this page component */

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
    { label: 'Reject', endpoint: 'reject', needsReason: true, destructive: true },
  ],
  APPROVED: [{ label: 'Void', endpoint: 'void', needsReason: true, destructive: true }],
  // REJECTED and VOID are terminal - no actions
};

function lookupLabel(value: unknown): string {
  if (value == null || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const ref = value as {
      label?: unknown;
      name?: unknown;
      code?: unknown;
      type?: unknown;
      id?: unknown;
    };
    return lookupLabel(ref.label ?? ref.name ?? ref.code ?? ref.type ?? ref.id);
  }
  return String(value);
}

function numeric(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function money(value: unknown): string {
  return formatCurrency(numeric(value));
}

function hasHtmlText(value: string): boolean {
  return (
    value
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim().length > 0
  );
}

function lineAmount(value: PurchaseOrderLineAmountLike): number {
  return calculateRoundedLineAmount(value);
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
      <div className="mb-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
        {children ?? '-'}
      </div>
    </div>
  );
}

/* ---- Page ---- */

export function SCODetailPage() {
  const { projectId = '', scoId = '' } = useParams<{ projectId: string; scoId: string }>();
  const { can } = useAccess();

  const { data: sco, isLoading, refetch: refetchScoDetail } = useSCODetailQuery(scoId);
  const { data: project } = useProjectDetailQuery(projectId);
  const purchaseOrderId = sco?.purchaseOrderId ?? sco?.purchaseOrder?.id ?? '';
  const { data: purchaseOrderDetail, isFetching: isPurchaseOrderFetching } =
    usePODetailQuery(purchaseOrderId);
  useBreadcrumbLabel(
    projectId && scoId ? `/app/project/${projectId}/sub-change-order/${scoId}` : undefined,
    sco?.scoNumber ?? sco?.title ?? undefined
  );
  const { data: costCodes = [] } = useProjectCostCodesQuery(projectId);
  const { data: scoFolderId } = useProjectFolderQuery(projectId || undefined, 'sub change order');
  const { data: scoEntityFolderId } = useProjectEntityFolderQuery(
    projectId || undefined,
    'SUB_CHANGE_ORDER',
    scoId || undefined,
    project?.capabilities?.actions?.subChangeOrder?.update === true
  );
  const scoUploadFolderId = scoEntityFolderId ?? scoFolderId;
  const { data: pdfTermsConfig } = usePdfTermsConfigQuery('subChangeOrder');
  const { data: pdfNoticeConfig } = usePdfNoticeConfigQuery('subChangeOrder');
  const pdfTermsOptions = useMemo(() => pdfTermsConfig?.options ?? [], [pdfTermsConfig?.options]);
  const pdfNoticeOptions = useMemo(
    () => pdfNoticeConfig?.options ?? [],
    [pdfNoticeConfig?.options]
  );
  const defaultPdfTermsOption = useMemo(
    () =>
      pdfTermsOptions.find((option) => option.id === pdfTermsConfig?.defaultOptionId) ??
      pdfTermsOptions.find((option) => option.isDefault) ??
      pdfTermsOptions[0],
    [pdfTermsConfig?.defaultOptionId, pdfTermsOptions]
  );
  const defaultPdfNoticeOption = useMemo(
    () =>
      pdfNoticeOptions.find((option) => option.id === pdfNoticeConfig?.defaultOptionId) ??
      pdfNoticeOptions.find((option) => option.isDefault) ??
      pdfNoticeOptions[0],
    [pdfNoticeConfig?.defaultOptionId, pdfNoticeOptions]
  );

  const approveMutation = useApproveSCOMutation();
  const rejectMutation = useRejectSCOMutation();
  const voidMutation = useVoidSCOMutation();
  const generatePdfMutation = useGenerateSCOPdfMutation();
  const savePdfMutation = useSaveSCOPdfMutation();
  const sendEmailMutation = useSendFeatureMailMutation();
  const addAttachmentMutation = useAddSCOAttachmentMutation();
  const removeAttachmentMutation = useRemoveSCOAttachmentMutation();
  const uploadManager = useUploadManager();
  const downloadFile = useDownloadFile();

  const costCodeMap = new Map(costCodes.map((cc) => [cc.id, `${cc.code} - ${cc.name}`]));
  const attachments = (sco?.attachments ?? []) as {
    id: string;
    documentId?: string;
    document?: FilePreviewItem;
  }[];

  const [sidebarOpen, setSidebarOpen] = useResponsiveDetailSidebar();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pdfOptionsOpen, setPdfOptionsOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<GeneratedPdfFile | null>(null);
  const [attachmentPreviewFile, setAttachmentPreviewFile] = useState<FilePreviewItem | null>(null);
  const [pdfIncludeNotice, setPdfIncludeNotice] = useState(false);
  const [pdfNoticeTitle, setPdfNoticeTitle] = useState('');
  const [pdfNoticeHtml, setPdfNoticeHtml] = useState('');
  const [pdfNoticeTemplateId, setPdfNoticeTemplateId] = useState('');
  const [pdfDefaultNoticeApplied, setPdfDefaultNoticeApplied] = useState(false);
  const [pdfIncludeTerms, setPdfIncludeTerms] = useState(false);
  const [pdfTermsHtml, setPdfTermsHtml] = useState('');
  const [pdfTermsTemplateId, setPdfTermsTemplateId] = useState('');
  const [pdfDefaultTermsApplied, setPdfDefaultTermsApplied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const emailTarget = useMemo<FeatureMailTarget | null>(
    () => (scoId ? { feature: 'subChangeOrder.vendorApproval', entityId: scoId } : null),
    [scoId]
  );
  const emailDraftQuery = useFeatureMailDraftQuery(emailTarget, emailOpen);

  // Workflow dialog state
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);
  const [actionReason, setActionReason] = useState('');

  const statusName = typeof sco?.status === 'string' ? sco.status : (sco?.status?.name ?? '');
  const statusLabel =
    typeof sco?.status === 'string' ? sco.status : (sco?.status?.label ?? statusName);
  const isDraft = statusName === 'DRAFT';
  const isApproved = statusName === 'APPROVED';
  const isRejected = statusName === 'REJECTED';
  const isVoid = statusName === 'VOID';

  const projectActions = project?.capabilities?.actions;
  const canApprove = projectActions?.subChangeOrder?.approve === true && isDraft;
  const canReject = projectActions?.subChangeOrder?.reject === true && isDraft;
  const canVoid = projectActions?.subChangeOrder?.void === true && isApproved;
  const canEdit = projectActions?.subChangeOrder?.update === true;
  const canSavePdf = projectActions?.subChangeOrder?.update === true;
  const canEmailSCO = can('mail', 'send') && isApproved;

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

  function handlePdfOptionsOpenChange(open: boolean) {
    setPdfOptionsOpen(open);
    if (!open) setPdfPreview(null);
  }

  function applyDefaultPdfTermsIfEmpty() {
    if (!defaultPdfTermsOption?.html || hasHtmlText(pdfTermsHtml)) return false;
    setPdfTermsTemplateId(defaultPdfTermsOption.id);
    setPdfTermsHtml(defaultPdfTermsOption.html);
    setPdfDefaultTermsApplied(true);
    return true;
  }

  function applyDefaultPdfNoticeIfEmpty() {
    if (!defaultPdfNoticeOption?.html || hasHtmlText(pdfNoticeHtml)) return false;
    setPdfNoticeTemplateId(defaultPdfNoticeOption.id);
    setPdfNoticeTitle(defaultPdfNoticeOption.title);
    setPdfNoticeHtml(defaultPdfNoticeOption.html);
    setPdfDefaultNoticeApplied(true);
    return true;
  }

  function generatePdfPreview(data: GenerateSCOPdfInput) {
    generatePdfMutation.mutate(
      { id: scoId, scoNumber: sco?.scoNumber, data },
      {
        onSuccess: (file) => {
          setPdfPreview(file);
        },
      }
    );
  }

  function savePdfToFiles(data: GenerateSCOPdfInput) {
    savePdfMutation.mutate(
      { id: scoId, scoNumber: sco?.scoNumber, purchaseOrderId, data },
      {
        onSuccess: (file) => {
          setPdfPreview(file);
        },
      }
    );
  }

  function preparePdfRequest(): GenerateSCOPdfInput {
    const shouldEnableDefaultNotice =
      !pdfDefaultNoticeApplied && pdfNoticeConfig?.includeByDefault === true;
    const shouldApplyDefaultNotice = shouldEnableDefaultNotice || pdfIncludeNotice;
    const defaultNoticeApplied =
      !pdfDefaultNoticeApplied && shouldApplyDefaultNotice ? applyDefaultPdfNoticeIfEmpty() : false;
    const nextNoticeTitle =
      defaultNoticeApplied && defaultPdfNoticeOption?.title
        ? defaultPdfNoticeOption.title
        : pdfNoticeTitle;
    const nextNoticeHtml =
      defaultNoticeApplied && defaultPdfNoticeOption?.html
        ? defaultPdfNoticeOption.html
        : pdfNoticeHtml;
    const nextIncludeNotice =
      shouldApplyDefaultNotice && hasHtmlText(nextNoticeHtml) ? true : pdfIncludeNotice;
    const shouldEnableDefaultTerms =
      !pdfDefaultTermsApplied && pdfTermsConfig?.includeByDefault === true;
    const shouldApplyDefaultTerms = shouldEnableDefaultTerms || pdfIncludeTerms;
    const defaultTermsApplied =
      !pdfDefaultTermsApplied && shouldApplyDefaultTerms ? applyDefaultPdfTermsIfEmpty() : false;
    const nextTermsHtml =
      defaultTermsApplied && defaultPdfTermsOption?.html
        ? defaultPdfTermsOption.html
        : pdfTermsHtml;
    const nextIncludeTerms =
      shouldApplyDefaultTerms && hasHtmlText(nextTermsHtml) ? true : pdfIncludeTerms;

    if (nextIncludeNotice) {
      setPdfIncludeNotice(true);
    }
    if (nextIncludeTerms) {
      setPdfIncludeTerms(true);
    }

    return {
      addWarningNotice: nextIncludeNotice,
      warningNoticeTitle: nextIncludeNotice ? nextNoticeTitle : undefined,
      warningNoticeHtml: nextIncludeNotice ? nextNoticeHtml : undefined,
      addTermsAndConditions: nextIncludeTerms,
      termsAndConditionsHtml: nextIncludeTerms ? nextTermsHtml : undefined,
    };
  }

  function openPdfOptions() {
    if (!sco?.lineItems || sco.lineItems.length === 0) {
      toast.error('SCO must have at least one line item to generate a PDF.');
      return;
    }
    const request = preparePdfRequest();
    setPdfPreview(null);
    setPdfOptionsOpen(true);
    generatePdfPreview(request);
  }

  function openEmailFlow() {
    if (!emailTarget || !sco) return;

    if (!sco?.lineItems || sco.lineItems.length === 0) {
      toast.error('SCO must have at least one line item to generate a PDF.');
      return;
    }

    const vendorEmail =
      typeof purchaseOrderDetail?.vendor?.email === 'string'
        ? purchaseOrderDetail.vendor.email
        : undefined;
    if (!vendorEmail) {
      toast.info(
        `${purchaseOrderDetail?.vendor?.name ?? 'Vendor'} does not have a vendor email. Select a contact recipient if available.`
      );
    }

    const request = preparePdfRequest();
    setPdfPreview(null);
    sendEmailMutation.reset();
    setEmailOpen(true);
    generatePdfPreview(request);
  }

  function handleEmailOpenChange(open: boolean) {
    setEmailOpen(open);
    if (!open) {
      sendEmailMutation.reset();
      setPdfPreview(null);
    }
  }

  function handlePdfIncludeNoticeChange(includeNotice: boolean) {
    setPdfIncludeNotice(includeNotice);
    if (includeNotice) {
      applyDefaultPdfNoticeIfEmpty();
    }
  }

  function handlePdfNoticeTemplateChange(optionId: string) {
    const option = pdfNoticeOptions.find((noticeOption) => noticeOption.id === optionId);
    if (!option) return;

    setPdfNoticeTemplateId(option.id);
    setPdfNoticeTitle(option.title);
    setPdfNoticeHtml(option.html);
    setPdfIncludeNotice(true);
    setPdfDefaultNoticeApplied(true);
  }

  function handlePdfIncludeTermsChange(includeTerms: boolean) {
    setPdfIncludeTerms(includeTerms);
    if (includeTerms) {
      applyDefaultPdfTermsIfEmpty();
    }
  }

  function handlePdfTermsTemplateChange(optionId: string) {
    const option = pdfTermsOptions.find((termsOption) => termsOption.id === optionId);
    if (!option) return;

    setPdfTermsTemplateId(option.id);
    setPdfTermsHtml(option.html);
    setPdfIncludeTerms(true);
    setPdfDefaultTermsApplied(true);
  }

  const isActionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    voidMutation.isPending ||
    sendEmailMutation.isPending;

  if (isLoading) {
    return <ProjectDetailPageLoading statsCount={5} />;
  }

  if (!sco) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Change order not found.</div>
      </div>
    );
  }

  const taxPercent = numeric(sco.taxPercent);
  const detailTotals = calculateEffectivePurchaseOrderTotals({
    lineItems: sco.lineItems.length > 0 ? sco.lineItems : undefined,
    subtotal: sco.lineItems.length > 0 ? undefined : sco.amount,
    negotiatedDiscount: sco.negotiatedDiscount,
    shippingHandlingFee: sco.shippingHandlingFee,
    taxPercent,
    taxAmount: sco.taxAmount,
  });
  const amount = detailTotals.subtotal;
  const negotiatedDiscount = detailTotals.negotiatedDiscount;
  const shippingHandlingFee = detailTotals.shippingHandlingFee;
  const taxAmount = detailTotals.taxAmount;
  const totalAmount = detailTotals.total;
  const embeddedPurchaseOrder = sco.purchaseOrder as
    | {
        id?: string;
        poNumber?: string | null;
        description?: string | null;
        expectedDate?: string | null;
        deliveryDate?: string | null;
        leadTime?: string | null;
        paymentTerms?: string | null;
        tradeCategory?: unknown;
        tradeCategoryLabel?: string | null;
        total?: string | number | null;
        status?: string | null;
        vendor?: { name?: string | null } | null;
      }
    | undefined;
  const linkedPurchaseOrder = purchaseOrderDetail ?? embeddedPurchaseOrder;
  const purchaseOrderTotal = Number(linkedPurchaseOrder?.total ?? 0);
  const purchaseOrderLabel = linkedPurchaseOrder?.poNumber ?? sco.purchaseOrderId ?? '-';
  const purchaseOrderVendor =
    purchaseOrderDetail?.vendor?.name ??
    embeddedPurchaseOrder?.vendor?.name ??
    sco.vendor?.name ??
    '-';
  const purchaseOrderStatus = lookupLabel(
    purchaseOrderDetail?.status ?? embeddedPurchaseOrder?.status
  );
  const purchaseOrderTradeCategory =
    purchaseOrderDetail?.tradeCategoryLabel ??
    lookupLabel(embeddedPurchaseOrder?.tradeCategory ?? embeddedPurchaseOrder?.tradeCategoryLabel);
  const purchaseOrderPaymentTerms = linkedPurchaseOrder?.paymentTerms
    ? String(linkedPurchaseOrder.paymentTerms).replace(/_/g, ' ')
    : '-';
  const purchaseOrderExpectedDate = linkedPurchaseOrder?.expectedDate
    ? formatDate(linkedPurchaseOrder.expectedDate)
    : '-';
  const purchaseOrderDeliveryDate = linkedPurchaseOrder?.deliveryDate
    ? formatDate(linkedPurchaseOrder.deliveryDate)
    : '-';
  const purchaseOrderLineItemCount = purchaseOrderDetail?.lineItems?.length ?? 0;
  const purchaseOrderAttachmentCount = purchaseOrderDetail?.attachments?.length ?? 0;
  const hasReasonBanner = (isRejected && sco.rejectionReason) || (isVoid && sco.voidReason);

  return (
    <div className="container-fluid max-w-full overflow-x-clip pb-5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Sub Change Order
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToolbarPageTitle>
                {sco.scoNumber ?? sco.title ?? 'Sub Change Order'}
              </ToolbarPageTitle>
              {sco.status && <StatusBadge label={statusLabel} status={statusName} />}
              <FeatureEmailSentBadge sentAt={sco.sentAt} log={sco.latestEmailLog} />
              {sco.changeType && (
                <Badge variant="primary" appearance="outline" size="sm">
                  {lookupLabel(sco.changeType)}
                </Badge>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" onClick={openPdfOptions}>
              <FileText className="size-4" />
              Generate PDF
            </Button>
            {canEmailSCO && (
              <Button variant="outline" size="sm" onClick={openEmailFlow}>
                <Mail className="size-4" />
                Email SCO
              </Button>
            )}

            {/* Approve - only on DRAFT */}
            {canApprove && (
              <Button
                size="sm"
                disabled={isActionPending}
                onClick={() =>
                  handleActionClick({ label: 'Approve', endpoint: 'approve', needsReason: false })
                }
              >
                <CheckCircle2 className="size-4" />
                Approve
              </Button>
            )}

            {/* Reject - only on DRAFT */}
            {canReject && (
              <Button
                variant="destructive"
                size="sm"
                disabled={isActionPending}
                onClick={() =>
                  handleActionClick({
                    label: 'Reject',
                    endpoint: 'reject',
                    needsReason: true,
                    destructive: true,
                  })
                }
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            )}

            {/* Void - on APPROVED */}
            {canVoid && (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionPending}
                onClick={() =>
                  handleActionClick({
                    label: 'Void',
                    endpoint: 'void',
                    needsReason: true,
                    destructive: true,
                  })
                }
              >
                <ShieldAlert className="size-4" />
                Void
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
          <StatsBar variant="cards" width="full" columns={{ sm: 2, xl: 4 }}>
            <StatsBarItem
              variant="card"
              label="SCO Amount"
              value={money(amount)}
              description="Line item total"
              dotColor="bg-primary"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Shipping and Handling Fee"
              value={money(shippingHandlingFee)}
              description="Added shipping and handling fee"
              dotColor="bg-label-lighter"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Total"
              value={money(totalAmount)}
              description="SCO total"
              dotColor="bg-info"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Linked PO"
              value={purchaseOrderLabel}
              description={String(purchaseOrderStatus)}
              dotColor="bg-success"
              valueColor="text-foreground"
            />
          </StatsBar>

          {hasReasonBanner && (
            <div className="relative flex flex-col gap-4 rounded-xl border border-border border-s-4 border-s-muted-foreground/30 bg-muted/20 p-5 shadow-xs shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-xs border border-border">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Change Order Alert
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {isRejected ? 'Rejection Reason' : 'Void Reason'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {isRejected ? sco.rejectionReason : sco.voidReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                Sub Change Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {sco.scoNumber && <InfoRow label="SCO #">{sco.scoNumber}</InfoRow>}
              <InfoRow label="Title">{sco.title}</InfoRow>
              <InfoRow label="Date">{sco.date ? formatDate(sco.date) : '-'}</InfoRow>
              <InfoRow label="Change Type">
                {sco.changeType ? (
                  <Badge variant="primary" appearance="light" size="sm">
                    {lookupLabel(sco.changeType)}
                  </Badge>
                ) : (
                  '-'
                )}
              </InfoRow>
              {/* Hidden until /sub-change-order/{id} includes priority. */}
              {/* Hidden until /sub-change-order/{id} includes initiatedBy. */}
              <InfoRow label="Purchase Order">{purchaseOrderLabel}</InfoRow>
              <InfoRow label="Vendor">{purchaseOrderVendor}</InfoRow>
              {/* Hidden until /sub-change-order/{id} includes vendorContactName. */}
              {/* Hidden until /sub-change-order/{id} includes vendorContactEmail. */}
              {/* Hidden until /sub-change-order/{id} includes vendorReferenceNumber. */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                  Purchase Order
                </CardTitle>
                {isPurchaseOrderFetching && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Loading purchase order details...
                  </div>
                )}
              </div>
              {linkedPurchaseOrder?.id && (
                <Link
                  to={`/app/project/${projectId}/purchase-orders/${linkedPurchaseOrder.id}`}
                  className="flex items-center gap-1 text-xs font-medium uppercase tracking-normal text-muted-foreground hover:text-foreground"
                >
                  View PO
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                <DetailField label="PO Number">{purchaseOrderLabel}</DetailField>
                <DetailField label="Vendor">{purchaseOrderVendor}</DetailField>
                <DetailField label="PO Status">{purchaseOrderStatus}</DetailField>
                <DetailField label="PO Total">
                  {purchaseOrderTotal ? money(purchaseOrderTotal) : '-'}
                </DetailField>
                <DetailField label="Trade Category">{purchaseOrderTradeCategory}</DetailField>
                <DetailField label="Expected Date">{purchaseOrderExpectedDate}</DetailField>
                <DetailField label="Delivery Date">{purchaseOrderDeliveryDate}</DetailField>
                <DetailField label="Payment Terms">{purchaseOrderPaymentTerms}</DetailField>
                <DetailField label="Lead Time">{linkedPurchaseOrder?.leadTime ?? '-'}</DetailField>
                <DetailField label="PO Line Items">{purchaseOrderLineItemCount}</DetailField>
                <DetailField label="PO Attachments">{purchaseOrderAttachmentCount}</DetailField>
              </div>
              {linkedPurchaseOrder?.description && (
                <div className="mt-5 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {linkedPurchaseOrder.description}
                </div>
              )}
              {purchaseOrderDetail?.lineItems?.length ? (
                <div className="mt-5 min-w-0">
                  <div className="space-y-3 lg:hidden">
                    {purchaseOrderDetail.lineItems.map((item) => (
                      <div key={item.id} className="min-w-0 rounded-lg border p-3">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                              {item.description}
                            </div>
                            {item.notes && (
                              <div className="mt-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                {item.notes}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                            {money(item.amount)}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">Qty</div>
                            <div className="font-medium tabular-nums">
                              {formatDecimal(item.quantity)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Unit</div>
                            <div className="break-words font-medium [overflow-wrap:anywhere]">
                              {lookupLabel(item.unit ?? item.unitId)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <DetailTable
                    ariaLabel="Purchase order items"
                    className="hidden lg:block"
                    columns={[
                      { key: 'description', header: 'PO Item' },
                      { align: 'end', key: 'quantity', header: 'Qty' },
                      { key: 'unit', header: 'Unit' },
                      { align: 'end', key: 'amount', header: 'Amount' },
                    ]}
                    rows={purchaseOrderDetail.lineItems}
                    getRowId={(item) => item.id}
                    renderCell={(item, key) => {
                      switch (key) {
                        case 'description':
                          return (
                            <>
                              <div className="font-medium">{item.description}</div>
                              {item.notes && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {item.notes}
                                </div>
                              )}
                            </>
                          );
                        case 'quantity':
                          return (
                            <span className="tabular-nums">{formatDecimal(item.quantity)}</span>
                          );
                        case 'unit':
                          return lookupLabel(item.unit ?? item.unitId);
                        default:
                          return (
                            <span className="font-medium tabular-nums">{money(item.amount)}</span>
                          );
                      }
                    }}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Description */}
          {sco.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sco.description && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{sco.description}</p>
                )}
                {/* Hidden until /sub-change-order/{id} includes reasonForChange. */}
                {/* Hidden until /sub-change-order/{id} includes detailedScope. */}
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                Line Items ({sco.lineItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sco.lineItems.length > 0 ? (
                <>
                  <div className="space-y-3 lg:hidden">
                    {sco.lineItems.map((li, idx) => (
                      <div key={li.id} className="rounded-lg border p-3">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                              Line {idx + 1}
                            </div>
                            <div className="mt-1 break-words text-sm font-semibold text-foreground">
                              {li.description}
                            </div>
                            {li.notes && (
                              <div className="mt-1 break-words text-xs text-muted-foreground">
                                {li.notes}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                            {money(lineAmount(li))}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">Qty</div>
                            <div className="font-medium tabular-nums">
                              {li.quantity != null || li.qty != null
                                ? formatDecimal(li.quantity ?? li.qty)
                                : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Unit</div>
                            <div className="font-medium">{lookupLabel(li.unit ?? li.unitId)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Unit Price</div>
                            <div className="font-medium tabular-nums">{money(li.unitPrice)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Cost Code</div>
                            <div className="break-words font-medium">
                              {li.costCodeId ? (costCodeMap.get(li.costCodeId) ?? '-') : '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <InfoRow label="Subtotal">{money(amount)}</InfoRow>
                      {negotiatedDiscount !== 0 && (
                        <InfoRow label="Negotiated Discount">-{money(negotiatedDiscount)}</InfoRow>
                      )}
                      {shippingHandlingFee !== 0 && (
                        <InfoRow label="Shipping and Handling Fee">
                          {money(shippingHandlingFee)}
                        </InfoRow>
                      )}
                      {taxAmount !== 0 && (
                        <InfoRow label={formatPurchaseOrderTaxLabel(taxPercent)}>
                          {money(taxAmount)}
                        </InfoRow>
                      )}
                      <Separator className="my-2" />
                      <InfoRow label="Total">
                        <span className="font-semibold">{money(totalAmount)}</span>
                      </InfoRow>
                    </div>
                  </div>

                  <DetailTable
                    ariaLabel="Change order line items"
                    className="hidden lg:block"
                    columns={[
                      { key: 'index', header: '#', width: 'w-8' },
                      { key: 'description', header: 'Description' },
                      { key: 'costCode', header: 'Cost Code', width: 'w-40' },
                      { align: 'end', key: 'quantity', header: 'Qty' },
                      { key: 'unit', header: 'Unit' },
                      { align: 'end', key: 'unitPrice', header: 'Unit Price' },
                      { align: 'end', key: 'amount', header: 'Amount' },
                    ]}
                    rows={sco.lineItems}
                    getRowId={(li) => li.id}
                    renderCell={(li, key, idx) => {
                      switch (key) {
                        case 'index':
                          return <span className="text-muted-foreground">{idx + 1}</span>;
                        case 'description':
                          return (
                            <>
                              <div className="font-medium">{li.description}</div>
                              {li.notes && (
                                <div className="mt-1 text-xs text-muted-foreground">{li.notes}</div>
                              )}
                            </>
                          );
                        case 'costCode':
                          return (
                            <span className="text-xs text-muted-foreground">
                              {li.costCodeId ? (costCodeMap.get(li.costCodeId) ?? '-') : '-'}
                            </span>
                          );
                        case 'quantity':
                          return (
                            <span className="tabular-nums">
                              {li.quantity != null || li.qty != null
                                ? formatDecimal(li.quantity ?? li.qty)
                                : '-'}
                            </span>
                          );
                        case 'unit':
                          return lookupLabel(li.unit ?? li.unitId);
                        case 'unitPrice':
                          return <span className="tabular-nums">{money(li.unitPrice)}</span>;
                        default:
                          return (
                            <span className="font-medium tabular-nums">
                              {money(lineAmount(li))}
                            </span>
                          );
                      }
                    }}
                    footer={
                      <>
                        <SCOTotalRow label="Subtotal" value={money(amount)} />
                        {negotiatedDiscount !== 0 && (
                          <SCOTotalRow
                            label="Negotiated Discount"
                            value={`-${money(negotiatedDiscount)}`}
                          />
                        )}
                        {shippingHandlingFee !== 0 && (
                          <SCOTotalRow
                            label="Shipping and Handling Fee"
                            value={money(shippingHandlingFee)}
                          />
                        )}
                        {taxAmount !== 0 && (
                          <SCOTotalRow
                            label={formatPurchaseOrderTaxLabel(taxPercent)}
                            value={money(taxAmount)}
                          />
                        )}
                        <SCOTotalRow emphasis label="Total" value={money(totalAmount)} />
                      </>
                    }
                  />
                </>
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
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                Documents ({attachments.length})
              </CardTitle>
              {canEdit && scoUploadFolderId && (
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
                      className="flex min-w-0 max-w-full flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 max-w-full flex-1 items-center gap-3">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        {att.document?.id ? (
                          <button
                            type="button"
                            className="block w-full max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                            onClick={() => setAttachmentPreviewFile(att.document!)}
                          >
                            {att.document?.displayName ?? att.document?.name ?? 'Document'}
                          </button>
                        ) : (
                          <span className="max-w-full truncate text-sm font-medium">
                            {att.document?.name ?? 'Document'}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                        {att.document?.id && (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            aria-label={`Download ${att.document?.name ?? 'document'}`}
                            onClick={() => downloadFile.mutate(att.document!)}
                          >
                            <Download className="size-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            aria-label={`Remove ${att.document?.name ?? 'document'}`}
                            onClick={() =>
                              removeAttachmentMutation.mutate({ scoId, attachmentId: att.id })
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activityChildren={
            <ProjectActivityPanel
              entityType="subChangeOrder"
              entityId={scoId}
              emptyMessage="No activity recorded yet."
            />
          }
        >
          <div className="space-y-6 pt-2">
            {/* Financial Summary */}
            <div>
              <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-3">
                Financial Summary
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <InfoRow label="Subtotal">{money(amount)}</InfoRow>
                  {negotiatedDiscount !== 0 && (
                    <InfoRow label="Negotiated Discount">-{money(negotiatedDiscount)}</InfoRow>
                  )}
                  {shippingHandlingFee !== 0 && (
                    <InfoRow label="Shipping and Handling Fee">
                      {money(shippingHandlingFee)}
                    </InfoRow>
                  )}
                  {taxAmount !== 0 && (
                    <InfoRow label={formatPurchaseOrderTaxLabel(taxPercent)}>
                      {money(taxAmount)}
                    </InfoRow>
                  )}
                  <Separator className="my-2" />
                  <InfoRow label="Total">
                    <span className="font-semibold">{money(totalAmount)}</span>
                  </InfoRow>
                  {/* Hidden until /sub-change-order/{id} includes retainagePercent. */}
                  {/* Hidden until /sub-change-order/{id} includes paymentTerms. */}
                  <Separator className="my-2" />
                  <InfoRow label="Purchase Order">{purchaseOrderLabel}</InfoRow>
                  <InfoRow label="PO Total">
                    {purchaseOrderTotal ? money(purchaseOrderTotal) : '-'}
                  </InfoRow>
                  <InfoRow label="PO Vendor">{purchaseOrderVendor}</InfoRow>
                </CardContent>
              </Card>
            </div>

            {/* Timeline */}
            <div>
              <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-3">
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

      {pdfOptionsOpen && (
        <PdfGenerateDialog
          open={pdfOptionsOpen}
          title="Generate SCO PDF"
          onOpenChange={handlePdfOptionsOpenChange}
          includeNotice={pdfIncludeNotice}
          noticeTitle={pdfNoticeTitle}
          noticeHtml={pdfNoticeHtml}
          noticeOptions={pdfNoticeOptions}
          selectedNoticeOptionId={pdfNoticeTemplateId}
          includeTerms={pdfIncludeTerms}
          termsHtml={pdfTermsHtml}
          termsOptions={pdfTermsOptions}
          selectedTermsOptionId={pdfTermsTemplateId}
          previewFile={pdfPreview}
          isGenerating={generatePdfMutation.isPending}
          isSaving={savePdfMutation.isPending}
          canSave={canSavePdf}
          onIncludeNoticeChange={handlePdfIncludeNoticeChange}
          onNoticeOptionChange={handlePdfNoticeTemplateChange}
          onNoticeTitleChange={setPdfNoticeTitle}
          onNoticeHtmlChange={setPdfNoticeHtml}
          onIncludeTermsChange={handlePdfIncludeTermsChange}
          onTermsOptionChange={handlePdfTermsTemplateChange}
          onTermsHtmlChange={setPdfTermsHtml}
          onGenerate={(data) => {
            generatePdfPreview(data);
          }}
          onSave={(data) => {
            savePdfToFiles(data);
          }}
        />
      )}

      <DocumentEmailWizardDialog
        open={emailOpen}
        onOpenChange={handleEmailOpenChange}
        title="Email SCO"
        pdfTitle={sco.scoNumber ?? sco.title ?? 'Sub Change Order'}
        pdfSectionLabel="SCO PDF"
        sendLabel="Send SCO Email"
        draft={emailDraftQuery.data ?? null}
        isDraftLoading={emailDraftQuery.isLoading}
        isGenerating={generatePdfMutation.isPending}
        isSaving={savePdfMutation.isPending}
        isSending={sendEmailMutation.isPending}
        canSavePdf={canSavePdf}
        pdfPreviewFile={pdfPreview}
        includeNotice={pdfIncludeNotice}
        noticeTitle={pdfNoticeTitle}
        noticeHtml={pdfNoticeHtml}
        noticeOptions={pdfNoticeOptions}
        selectedNoticeOptionId={pdfNoticeTemplateId}
        includeTerms={pdfIncludeTerms}
        termsHtml={pdfTermsHtml}
        termsOptions={pdfTermsOptions}
        selectedTermsOptionId={pdfTermsTemplateId}
        onIncludeNoticeChange={handlePdfIncludeNoticeChange}
        onNoticeOptionChange={handlePdfNoticeTemplateChange}
        onNoticeTitleChange={setPdfNoticeTitle}
        onNoticeHtmlChange={setPdfNoticeHtml}
        onIncludeTermsChange={handlePdfIncludeTermsChange}
        onTermsOptionChange={handlePdfTermsTemplateChange}
        onTermsHtmlChange={setPdfTermsHtml}
        onGeneratePdf={(data) => {
          generatePdfPreview(data);
        }}
        onSavePdf={(data) => {
          savePdfToFiles(data);
        }}
        onSend={async (payload, pdfOptions) => {
          if (!emailTarget) return;
          await sendEmailMutation.mutateAsync({
            feature: emailTarget.feature,
            entityId: emailTarget.entityId,
            draft: payload,
            pdfOptions,
          });
          await refetchScoDetail();
          handleEmailOpenChange(false);
        }}
      />

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
                  for <strong>{formatCurrency(totalAmount)}</strong>
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

      {/* ---- Upload file dialog ---- */}
      {canEdit && scoUploadFolderId && (
        <UploadFileDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={scoUploadFolderId}
          onSubmit={(payload) => {
            uploadManager.enqueueUpload(payload, {
              label: 'SCO attachment',
              onUploaded: async (uploaded) => {
                await addAttachmentMutation.mutateAsync({
                  scoId,
                  data: { documentId: uploaded.id },
                });
              },
            });
            setUploadOpen(false);
          }}
          isSubmitting={false}
        />
      )}

      <FilePreviewDialog
        open={!!attachmentPreviewFile}
        onOpenChange={(open) => {
          if (!open) setAttachmentPreviewFile(null);
        }}
        file={attachmentPreviewFile}
      />
    </div>
  );
}

/** A totals row under the change order's line items. */
function SCOTotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <tr>
      <td
        colSpan={6}
        className={cn(
          'px-4 py-1.5 text-end text-xs text-muted-foreground',
          emphasis && 'font-semibold uppercase tracking-normal'
        )}
      >
        {label}
      </td>
      <td className={cn('px-4 py-1.5 text-end text-sm tabular-nums', emphasis && 'font-semibold')}>
        {value}
      </td>
    </tr>
  );
}
