import { useMemo, useState } from 'react';

import { DetailSidebar } from '@/app/components/detail-sidebar';
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
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { useAccess } from '@/app/contexts/access-context';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import type { GeneratedPdfFile } from '@/app/lib/generated-pdf';
import { formatCurrency, formatDate, formatPercent } from '@/app/lib/helpers';
import { ActivityFeed, type ActivityItem } from '@/core/ui/components/sections/activity-feed';
import { useActivityLogQuery } from '@/modules/directory/hooks/activity.hooks';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@/modules/files/hooks/files.hooks';
import { useFeatureMailDraftQuery, useSendFeatureMailMutation } from '@/modules/mail/hooks';
import type { FeatureMailTarget } from '@/modules/mail/schemas/mail.schema';
import { usePdfNoticeConfigQuery, usePdfTermsConfigQuery } from '@/modules/pdf/hooks';
import {
  PurchaseOrderCancelDialog,
  PurchaseOrderDetailLineItemsCard,
  PurchaseOrderDetailLinkedInvoicesCard,
  PurchaseOrderDetailLinkedSCOsCard,
  PurchaseOrderDetailPaymentsCard,
  PurchaseOrderPdfDialog,
} from '@/modules/project/components/purchase-order';
import {
  calculateEffectivePurchaseOrderTotals,
  formatPurchaseOrderTaxLabel,
} from '@/modules/project/components/purchase-order/purchase-order-totals';
import {
  DocumentEmailWizardDialog,
  InfoRow,
  ProjectDetailDocumentsCard,
  ProjectDetailField,
  ProjectDetailPageLoading,
} from '@/modules/project/components/shared';
import { getSubChangeOrderTotalAmount } from '@/modules/project/components/sub-change-order';
import {
  PO_STATUS_COLORS,
  TRADE_CATEGORY_BADGE_VARIANTS,
  TRADE_CATEGORY_LABELS,
} from '@/modules/project/constants/purchase-order';
import { useProjectCostCodesQuery, useProjectDetailQuery } from '@/modules/project/hooks';
import { useInvoicesByPurchaseOrderQuery } from '@/modules/project/hooks/invoice';
import {
  useAddPOAttachmentMutation,
  useCancelPOMutation,
  useGeneratePOPdfMutation,
  useIssuePOMutation,
  usePODetailQuery,
  useRecordDeliveryMutation,
  useRemovePOAttachmentMutation,
  useSavePOPdfMutation,
} from '@/modules/project/hooks/purchase-order';
import { useSCOsByPurchaseOrderQuery } from '@/modules/project/hooks/sub-change-order';
import {
  useProjectEntityFolderQuery,
  useProjectFolderQuery,
} from '@/modules/project/hooks/use-project-folder';
import type { GeneratePOPdfInput, POStatusName } from '@/modules/project/schemas/purchase-order';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  History,
  Mail,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  PlusCircle,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

/* ---- helpers ---- */

function calcOverdueDays(expectedDate: string | null | undefined): number {
  if (!expectedDate) return 0;
  const diff = Date.now() - new Date(expectedDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function hasHtmlText(value: string): boolean {
  return (
    value
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim().length > 0
  );
}

/* ---- Page ---- */

export function PODetailPage() {
  const { projectId = '', poId = '' } = useParams<{ projectId: string; poId: string }>();
  const { can } = useAccess();

  const { data: po, isLoading, refetch: refetchPoDetail } = usePODetailQuery(poId);
  const { data: project } = useProjectDetailQuery(projectId);
  const { data: linkedInvoices = [], isLoading: isLinkedInvoicesLoading } =
    useInvoicesByPurchaseOrderQuery(poId);
  const { data: linkedSCOs = [], isLoading: isLinkedSCOsLoading } =
    useSCOsByPurchaseOrderQuery(poId);
  const {
    data: activityData,
    isLoading: isActivityLoading,
    refetch: refetchActivity,
  } = useActivityLogQuery({
    entityType: 'purchaseOrder',
    entityId: poId,
    size: 50,
  });
  useBreadcrumbLabel(
    projectId && poId ? `/app/project/${projectId}/purchase-orders/${poId}` : undefined,
    po?.poNumber ?? undefined
  );
  const { data: costCodes = [] } = useProjectCostCodesQuery(projectId);
  const { data: poFolderId } = useProjectFolderQuery(projectId || undefined, 'purchase order');
  const { data: poEntityFolderId } = useProjectEntityFolderQuery(
    projectId || undefined,
    'PURCHASE_ORDER',
    poId || undefined,
    project?.capabilities?.actions?.purchaseOrder?.update === true
  );
  const poUploadFolderId = poEntityFolderId ?? poFolderId;
  const { data: pdfTermsConfig } = usePdfTermsConfigQuery('purchaseOrder');
  const { data: pdfNoticeConfig } = usePdfNoticeConfigQuery('purchaseOrder');
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

  const issueMutation = useIssuePOMutation();
  const cancelMutation = useCancelPOMutation();
  const recordDeliveryMutation = useRecordDeliveryMutation();
  const generatePdfMutation = useGeneratePOPdfMutation();
  const savePdfMutation = useSavePOPdfMutation();
  const sendEmailMutation = useSendFeatureMailMutation();
  const addAttachmentMutation = useAddPOAttachmentMutation();
  const removeAttachmentMutation = useRemovePOAttachmentMutation();
  const uploadFileMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

  const costCodeMap = new Map(costCodes.map((cc) => [cc.id, `${cc.code} - ${cc.name}`]));
  const attachments = po?.attachments ?? [];

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pdfOptionsOpen, setPdfOptionsOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<GeneratedPdfFile | null>(null);
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
    () => (poId ? { feature: 'purchaseOrder.vendorIssue', entityId: poId } : null),
    [poId]
  );
  const emailDraftQuery = useFeatureMailDraftQuery(emailTarget, emailOpen);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));

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

  function generatePdfPreview(data: GeneratePOPdfInput) {
    generatePdfMutation.mutate(
      { id: poId, poNumber: po?.poNumber, data },
      {
        onSuccess: (file) => {
          setPdfPreview(file);
        },
      }
    );
  }

  function savePdfToFiles(data: GeneratePOPdfInput) {
    savePdfMutation.mutate(
      { id: poId, poNumber: po?.poNumber, data },
      {
        onSuccess: (file) => {
          setPdfPreview(file);
        },
      }
    );
  }

  function preparePdfRequest(): GeneratePOPdfInput {
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
    if (!po?.lineItems?.length) {
      toast.error('Purchase order must have at least one line item to generate a PDF.');
      return;
    }
    const request = preparePdfRequest();
    setPdfPreview(null);
    setPdfOptionsOpen(true);
    generatePdfPreview(request);
  }

  function openEmailFlow() {
    if (!emailTarget || !po) return;

    if (!po.lineItems || po.lineItems.length === 0) {
      toast.error('Purchase order must have at least one line item to generate a PDF.');
      return;
    }

    if (!vendorEmail) {
      toast.info(
        `${po.vendor?.name ?? 'Vendor'} does not have a vendor email. Select a contact recipient if available.`
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

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!activityData?.data) return [];
    return activityData.data.map((log) => {
      const action = log.action.toLowerCase();
      let icon = <Clock className="size-4" />;
      let color = 'border-muted-foreground/20 bg-muted/30';

      if (action.includes('create') || action.includes('draft')) {
        icon = <PlusCircle className="size-4 text-primary" />;
        color = 'border-primary/20 bg-primary/5';
      } else if (action.includes('update')) {
        icon = <Pencil className="size-4 text-info" />;
        color = 'border-info/20 bg-info/5';
      } else if (action.includes('issue') || action.includes('deliver')) {
        icon = <CheckCircle2 className="size-4 text-success" />;
        color = 'border-success/20 bg-success/5';
      } else if (action.includes('cancel') || action.includes('reject')) {
        icon = <XCircle className="size-4 text-destructive" />;
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

  const statusName = (po?.status?.name ?? '') as POStatusName;
  const isDraft = statusName === 'DRAFT';
  const isIssued = statusName === 'ISSUED';
  const isCancelled = statusName === 'CANCELLED';
  const isDelivered = statusName === 'DELIVERED';

  const projectActions = project?.capabilities?.actions;
  const canSavePdf = projectActions?.purchaseOrder?.update === true;
  const canEdit = projectActions?.purchaseOrder?.update === true && isDraft;
  const canUploadBackupDocuments = projectActions?.purchaseOrder?.update === true && !isCancelled;
  const canIssue = projectActions?.purchaseOrder?.issue === true && isDraft;
  const canCancel = projectActions?.purchaseOrder?.cancel === true && !isCancelled && !isDelivered;
  const canRecordDelivery =
    projectActions?.purchaseOrder?.deliver === true && isIssued && !isDelivered;
  const canCreateSCO = projectActions?.subChangeOrder?.create === true && isIssued;
  const canEmailPO = can('mail', 'send') && (isIssued || isDelivered);
  const canUseActionsMenu = canEdit || canCancel;

  const isOverdue =
    !!po?.expectedDate &&
    !po.deliveryDate &&
    !isCancelled &&
    new Date(po.expectedDate) < new Date();
  const overdueDays = isOverdue ? calcOverdueDays(po.expectedDate) : 0;

  const isActionPending =
    issueMutation.isPending ||
    cancelMutation.isPending ||
    recordDeliveryMutation.isPending ||
    sendEmailMutation.isPending;

  if (isLoading) {
    return <ProjectDetailPageLoading statsCount={5} />;
  }

  if (!po) {
    return (
      <div className="container-fluid max-w-full overflow-x-hidden px-4 pb-5 sm:px-6 lg:px-7.5">
        <p className="text-sm text-muted-foreground">Purchase order not found.</p>
      </div>
    );
  }

  const purchaseOrderTotals = calculateEffectivePurchaseOrderTotals({
    lineItems: po.lineItems,
    subtotal: po.subtotal,
    negotiatedDiscount: po.negotiatedDiscount,
    shippingHandlingFee: po.shippingHandlingFee,
    taxPercent: po.taxPercent,
    taxAmount: po.taxAmount,
  });
  const poTotal = purchaseOrderTotals.total;
  const scoTotal = linkedSCOs
    .filter((sco) => sco.status === 'APPROVED')
    .reduce((sum, sco) => sum + getSubChangeOrderTotalAmount(sco), 0);
  const totalCommitment = poTotal + scoTotal;
  const amountPaid = linkedInvoices
    .filter((invoice) => invoice.isPaid)
    .reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
  const invoiceTotal = linkedInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.totalAmount ?? 0),
    0
  );
  const balanceDue = Math.max(totalCommitment - amountPaid, 0);
  const { subtotal, negotiatedDiscount, shippingHandlingFee, taxAmount } = purchaseOrderTotals;
  const retainagePercent = parseFloat(po.retainagePercent ?? '0');
  const readableRfq = po.rfq?.rfqNumber ?? po.rfq?.title ?? po.rfqId;
  const tradeLabel =
    po.tradeCategoryLabel ??
    (po.tradeCategory ? TRADE_CATEGORY_LABELS[po.tradeCategory] : undefined);
  const vendorEmail = typeof po.vendor?.email === 'string' ? po.vendor.email : undefined;

  return (
    <div className="container-fluid max-w-full overflow-x-hidden px-4 pb-5 sm:px-6 lg:px-7.5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
              <Link
                to={`/app/project/${projectId}/purchase-orders`}
                className="hover:text-foreground"
              >
                Purchase Orders
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToolbarPageTitle>{po.poNumber ?? 'Draft PO'}</ToolbarPageTitle>
              {po.rfqId && (
                <Link
                  to={`/app/project/${projectId}/rfqs/${po.rfqId}`}
                  className="text-xs text-primary hover:underline"
                >
                  {readableRfq}
                </Link>
              )}
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
                  {tradeLabel}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" size="sm">
                  <AlertTriangle className="size-3" />
                  Overdue
                </Badge>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" onClick={openPdfOptions}>
              <FileText className="size-4" />
              Generate PDF
            </Button>
            {canEmailPO && (
              <Button variant="outline" size="sm" onClick={openEmailFlow}>
                <Mail className="size-4" />
                Email PO
              </Button>
            )}
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
                  setDeliveryOpen(true);
                }}
              >
                <Truck className="size-4" />
                Mark Delivered
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
            {canUseActionsMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    mode="icon"
                    aria-label="Purchase order actions"
                  >
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

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-5">
          {/* ---- Overdue alert ---- */}
          {isOverdue && (
            <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="size-4 text-destructive" />
                  <span className="text-xs font-semibold tracking-normal text-destructive uppercase">
                    Purchase Alert
                  </span>
                </div>
                <p className="text-sm font-semibold text-destructive">Purchase Order is Overdue</p>
                <p className="text-xs text-destructive/70 mt-0.5">
                  Expected delivery was {po.expectedDate ? formatDate(po.expectedDate) : '-'}.
                  Delivery has not been recorded.
                </p>
              </div>
              <div className="shrink-0 text-left sm:pl-8 sm:text-right">
                <div className="text-4xl font-bold text-destructive tabular-nums leading-none">
                  {overdueDays}
                </div>
                <div className="text-xs text-destructive/70 mt-1">days overdue</div>
              </div>
            </div>
          )}

          {/* ---- Stat cards ---- */}
          <StatsBar
            variant="cards"
            width="full"
            columns={{ sm: 2, xl: 3, '2xl': 5 }}
            className="min-w-0"
          >
            <StatsBarItem
              variant="card"
              label="PO Total"
              value={formatCurrency(poTotal)}
              description="Base contract amount"
              dotColor="bg-primary"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="SCO Total"
              value={scoTotal > 0 ? `+${formatCurrency(scoTotal)}` : formatCurrency(0)}
              description="Approved change orders"
              dotColor="bg-label-lighter"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Total Commitment"
              value={formatCurrency(totalCommitment)}
              description="PO + approved SCOs"
              dotColor="bg-info"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Amount Paid"
              value={formatCurrency(amountPaid)}
              description="Via linked invoices"
              dotColor="bg-success"
              valueColor="text-foreground"
            />
            <StatsBarItem
              variant="card"
              label="Balance Due"
              value={formatCurrency(balanceDue)}
              description="Remaining balance"
              dotColor="bg-warning"
              valueColor="text-foreground"
            />
          </StatsBar>

          {/* ---- Cancelled reason banner ---- */}
          {isCancelled && (po as { cancellationReason?: string | null }).cancellationReason && (
            <div className="rounded-lg border border-muted bg-muted/30 px-5 py-4">
              <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-1">
                Cancellation Reason
              </div>
              <p className="text-sm text-foreground">
                {(po as { cancellationReason?: string | null }).cancellationReason}
              </p>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-5">
            {/* Left column: Vendor info + Line items */}
            <div className="min-w-0 space-y-5 2xl:col-span-3">
              {/* Vendor Information */}
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                    Vendor Information
                  </CardTitle>
                  {po.vendor?.id && (
                    <Link
                      to={`/app/directory/vendors/${po.vendor.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-normal"
                    >
                      View Profile
                      <ExternalLink className="size-3" />
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <ProjectDetailField label="Vendor">{po.vendor?.name}</ProjectDetailField>
                    <ProjectDetailField label="Email">
                      {vendorEmail ? (
                        <a href={`mailto:${vendorEmail}`} className="text-primary hover:underline">
                          {vendorEmail}
                        </a>
                      ) : (
                        '-'
                      )}
                    </ProjectDetailField>
                    <ProjectDetailField label="Lead Time">{po.leadTime}</ProjectDetailField>
                    <ProjectDetailField label="Payment Terms">
                      {po.paymentTerms?.replace(/_/g, ' ')}
                    </ProjectDetailField>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {po.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{po.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Additional Details */}
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                    Additional Details
                  </CardTitle>
                  {canEdit && (
                    <Link
                      to="edit"
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-normal"
                    >
                      Edit
                      <Pencil className="size-3" />
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <ProjectDetailField label="Trade">{tradeLabel ?? '-'}</ProjectDetailField>
                    <ProjectDetailField label="Linked RFQ">{readableRfq ?? '-'}</ProjectDetailField>
                    <ProjectDetailField label="Expected Date">
                      {po.expectedDate ? formatDate(po.expectedDate) : '-'}
                    </ProjectDetailField>
                    <ProjectDetailField label="Address">{po.address ?? '-'}</ProjectDetailField>
                    <ProjectDetailField label="Ship To" className="lg:row-span-2">
                      {po.shipToAddress ?? '-'}
                    </ProjectDetailField>
                    <ProjectDetailField label="Delivery Date">
                      {po.deliveryDate ? formatDate(po.deliveryDate) : '-'}
                    </ProjectDetailField>
                    {po.notes && (
                      <div className="pt-1 sm:col-span-2 lg:col-span-3">
                        <Separator className="mb-4" />
                        <ProjectDetailField label="Notes">
                          <span className="font-normal whitespace-pre-wrap">{po.notes}</span>
                        </ProjectDetailField>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <PurchaseOrderDetailLineItemsCard
                lineItems={po.lineItems ?? []}
                costCodeMap={costCodeMap}
                subtotal={subtotal}
                negotiatedDiscount={po.negotiatedDiscount}
                shippingHandlingFee={shippingHandlingFee}
                taxAmount={taxAmount}
                taxPercent={po.taxPercent}
                total={poTotal}
              />

              <ProjectDetailDocumentsCard
                title="Backup Documents"
                emptyMessage="No backup documents attached."
                documents={attachments}
                canUpload={canUploadBackupDocuments && !!poUploadFolderId}
                canRemove={canEdit}
                onUpload={() => setUploadOpen(true)}
                onDownload={(document) => downloadFile.mutate(document)}
                onRemove={(attachment) =>
                  removeAttachmentMutation.mutate({ poId, attachmentId: attachment.id })
                }
              />
            </div>

            {/* Right column: Placeholder sections */}
            <div className="min-w-0 space-y-5 2xl:col-span-2">
              <PurchaseOrderDetailPaymentsCard payments={po.poPayments ?? []} />

              <PurchaseOrderDetailLinkedInvoicesCard
                projectId={projectId}
                invoices={linkedInvoices}
                isLoading={isLinkedInvoicesLoading}
                invoiceTotal={invoiceTotal}
              />

              <PurchaseOrderDetailLinkedSCOsCard
                projectId={projectId}
                scos={linkedSCOs}
                isLoading={isLinkedSCOsLoading}
                approvedTotal={scoTotal}
                canCreate={canCreateSCO}
                createTo={`/app/project/${projectId}/sub-change-order/create?purchaseOrderId=${poId}`}
              />
            </div>
          </div>
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activityChildren={
            <div className="p-4">
              {isActivityLoading ? (
                <div className="py-6 text-center text-sm uppercase tracking-normal text-muted-foreground">
                  Loading activity...
                </div>
              ) : activityItems.length > 0 ? (
                <ActivityFeed items={activityItems} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <History className="size-8 text-muted-foreground/40" />
                  <p className="text-sm font-bold uppercase tracking-normal text-muted-foreground">
                    No activity recorded yet.
                  </p>
                </div>
              )}
            </div>
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
                  <InfoRow label="Subtotal">{formatCurrency(subtotal)}</InfoRow>
                  {negotiatedDiscount !== 0 && (
                    <InfoRow label="Negotiated Discount">
                      -{formatCurrency(negotiatedDiscount)}
                    </InfoRow>
                  )}
                  {shippingHandlingFee !== 0 && (
                    <InfoRow label="Shipping and Handling Fee">
                      {formatCurrency(shippingHandlingFee)}
                    </InfoRow>
                  )}
                  {taxAmount !== 0 && (
                    <InfoRow label={formatPurchaseOrderTaxLabel(po.taxPercent)}>
                      {formatCurrency(taxAmount)}
                    </InfoRow>
                  )}
                  <Separator className="my-1" />
                  <InfoRow label="Total">
                    <span className="font-semibold">{formatCurrency(poTotal)}</span>
                  </InfoRow>
                  {retainagePercent > 0 && (
                    <InfoRow label={`Retainage (${formatPercent(retainagePercent)})`}>
                      {formatCurrency(poTotal * (retainagePercent / 100))}
                    </InfoRow>
                  )}
                  {scoTotal > 0 && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow label="SCO Total">+{formatCurrency(scoTotal)}</InfoRow>
                      <InfoRow label="Total Commitment">{formatCurrency(totalCommitment)}</InfoRow>
                    </>
                  )}
                  {linkedInvoices.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow label="Invoice Total">{formatCurrency(invoiceTotal)}</InfoRow>
                      <InfoRow label="Amount Paid">{formatCurrency(amountPaid)}</InfoRow>
                      <InfoRow label="Balance Due">{formatCurrency(balanceDue)}</InfoRow>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Key Dates */}
            <div>
              <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-3">
                Key Dates
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {po.expectedDate && (
                    <div className="flex items-start gap-3">
                      <Calendar
                        className={`size-4 mt-0.5 shrink-0 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                      />
                      <div>
                        <div className="text-xs text-muted-foreground">Expected Delivery</div>
                        <div
                          className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}
                        >
                          {formatDate(po.expectedDate)}
                          {isOverdue && (
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
                        <div className="text-sm font-medium">{formatDate(po.deliveryDate)}</div>
                      </div>
                    </div>
                  )}
                  {po.issuedAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Issued</div>
                        <div className="text-sm font-medium">{formatDate(po.issuedAt)}</div>
                      </div>
                    </div>
                  )}
                  {po.approvedAt && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Approved</div>
                        <div className="text-sm font-medium">{formatDate(po.approvedAt)}</div>
                      </div>
                    </div>
                  )}
                  {po.rejectedAt && (
                    <div className="flex items-start gap-3">
                      <XCircle className="size-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Rejected</div>
                        <div className="text-sm font-medium">{formatDate(po.rejectedAt)}</div>
                      </div>
                    </div>
                  )}
                  {po.cancelledAt && (
                    <div className="flex items-start gap-3">
                      <XCircle className="size-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Cancelled</div>
                        <div className="text-sm font-medium">{formatDate(po.cancelledAt)}</div>
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
              <div className="text-xs font-semibold tracking-normal text-muted-foreground uppercase mb-3">
                PO Details
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <InfoRow label="Payment Terms">
                    {po.paymentTerms?.replace(/_/g, ' ') ?? '-'}
                  </InfoRow>
                  {po.rfqId && <InfoRow label="Linked RFQ">{readableRfq}</InfoRow>}
                  {/* Hidden until /purchase-order/{id} includes revisionNumber. */}
                  <InfoRow label="Project">{po.project?.name ?? '-'}</InfoRow>
                </CardContent>
              </Card>
            </div>
          </div>
        </DetailSidebar>
      </div>

      {pdfOptionsOpen && (
        <PurchaseOrderPdfDialog
          open={pdfOptionsOpen}
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
        title="Email Purchase Order"
        pdfTitle={po.poNumber ?? 'Purchase Order'}
        pdfSectionLabel="Purchase Order PDF"
        sendLabel="Send PO Email"
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
          await Promise.all([refetchPoDetail(), refetchActivity()]);
          handleEmailOpenChange(false);
        }}
      />

      {/* ---- Issue PO confirmation ---- */}
      <ConfirmDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        title="Issue Purchase Order"
        description={
          <>
            Issue <strong>{po.poNumber ?? 'this PO'}</strong> to <strong>{po.vendor?.name}</strong>{' '}
            for <strong>{formatCurrency(poTotal)}</strong>?
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
                  // Budget warning is non-blocking - handled by toast in mutation
                }
              },
            }
          );
        }}
        isPending={issueMutation.isPending}
      />

      <PurchaseOrderCancelDialog
        open={cancelOpen}
        purchaseOrderLabel={po.poNumber ?? 'this PO'}
        reason={cancelReason}
        isPending={isActionPending}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setCancelReason('');
        }}
        onReasonChange={setCancelReason}
        onConfirm={() => {
          cancelMutation.mutate(
            { id: poId, reason: cancelReason.trim() },
            {
              onSuccess: () => {
                setCancelOpen(false);
                setCancelReason('');
              },
            }
          );
        }}
      />

      {/* ---- Mark delivered dialog ---- */}
      <Dialog
        open={deliveryOpen}
        onOpenChange={(open) => {
          if (!open) setDeliveryOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Purchase Order Delivered</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark <strong>{po.poNumber ?? 'this PO'}</strong> as delivered.
            </p>
            <Field>
              <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                Delivery Date
              </FieldLabel>
              <InputWrapper>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                />
              </InputWrapper>
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
                  { id: poId, deliveryDate },
                  { onSuccess: () => setDeliveryOpen(false) }
                );
              }}
            >
              {recordDeliveryMutation.isPending ? 'Saving...' : 'Mark Delivered'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Upload file dialog ---- */}
      {canUploadBackupDocuments && poUploadFolderId && (
        <UploadFileDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={poUploadFolderId}
          onSubmit={({ file, data }) => {
            uploadFileMutation.mutate(
              { file, data },
              {
                onSuccess: (uploaded) => {
                  addAttachmentMutation.mutate(
                    { poId, data: { documentId: uploaded.id } },
                    { onSuccess: () => setUploadOpen(false) }
                  );
                },
              }
            );
          }}
          isSubmitting={uploadFileMutation.isPending || addAttachmentMutation.isPending}
        />
      )}
    </div>
  );
}
