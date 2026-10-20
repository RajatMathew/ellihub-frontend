import { useMemo, useState } from 'react';

import { DetailSidebar } from '@/app/components/detail-sidebar';
import { importedBadges, ImportSourcePanel } from '@/app/components/import-source';
import { DetailPageHeader } from '@/app/components/page-header';
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
import { Field, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { useAccess } from '@/app/contexts/access-context';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { useResponsiveDetailSidebar } from '@/app/hooks/use-responsive-detail-sidebar';
import {
  businessDaysSince,
  formatDateOnly,
  isBeforeBusinessToday,
  todayDateOnly,
} from '@/app/lib/dates';
import type { GeneratedPdfFile } from '@/app/lib/generated-pdf';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useDownloadFile } from '@/modules/files/hooks/files.hooks';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import { useFeatureMailDraftQuery, useSendFeatureMailMutation } from '@/modules/mail/hooks';
import type { FeatureMailTarget } from '@/modules/mail/schemas/mail.schema';
import { RecordPoPaymentDialog } from '@/modules/monthly-bills/components/record-po-payment-dialog';
import { usePdfNoticeConfigQuery, usePdfTermsConfigQuery } from '@/modules/pdf/hooks';
import {
  PurchaseOrderCancelDialog,
  PurchaseOrderDetailLineItemsCard,
  PurchaseOrderDetailLinkedInvoicesCard,
  PurchaseOrderDetailLinkedSCOsCard,
  PurchaseOrderDetailPaymentsCard,
  PurchaseOrderPdfDialog,
} from '@/modules/project/components/purchase-order';
import { calculateEffectivePurchaseOrderTotals } from '@/modules/project/components/purchase-order/purchase-order-totals';
import {
  DocumentEmailWizardDialog,
  FeatureEmailSentBadge,
  InfoRow,
  ProjectActivityPanel,
  ProjectDetailDocumentsCard,
  ProjectDetailField,
  ProjectDetailPageLoading,
} from '@/modules/project/components/shared';
import { getSubChangeOrderTotalAmount } from '@/modules/project/components/sub-change-order';
import {
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
import { toCommercialDecimal } from '@/modules/project/lib/commercial-decimal';
import { purchaseOrderAmountPaid } from '@/modules/project/lib/purchase-order-payments';
import type { GeneratePOPdfInput, POStatusName } from '@/modules/project/schemas/purchase-order';
import {
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Mail,
  Pencil,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

/* ---- helpers ---- */

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
  const uploadManager = useUploadManager();
  const downloadFile = useDownloadFile();

  const costCodeMap = new Map(costCodes.map((cc) => [cc.id, `${cc.code} - ${cc.name}`]));
  const attachments = po?.attachments ?? [];

  const [sidebarOpen, setSidebarOpen] = useResponsiveDetailSidebar();
  const [issueOpen, setIssueOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
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
  const [deliveryDate, setDeliveryDate] = useState(() => todayDateOnly());

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

  const statusName = (po?.status?.name ?? '') as POStatusName;
  const isDraft = statusName === 'DRAFT';
  const isIssued = statusName === 'ISSUED';
  const isCancelled = statusName === 'CANCELLED';
  const isDelivered = statusName === 'DELIVERED';

  const projectActions = project?.capabilities?.actions;
  const canSavePdf = projectActions?.purchaseOrder?.update === true;
  const canEdit = projectActions?.purchaseOrder?.update === true;
  const canUploadBackupDocuments = projectActions?.purchaseOrder?.update === true;
  const canIssue = projectActions?.purchaseOrder?.issue === true && isDraft;
  const canCancel = projectActions?.purchaseOrder?.cancel === true && !isCancelled && !isDelivered;
  const canRecordDelivery =
    projectActions?.purchaseOrder?.deliver === true && isIssued && !isDelivered;
  const canCreateSCO = projectActions?.subChangeOrder?.create === true && isIssued;
  const canEmailPO = can('mail', 'send') && (isIssued || isDelivered);

  // The API decides on the business calendar; the fallback applies the same
  // rule. Comparing the date's UTC midnight with the clock showed "Overdue" the
  // evening before in New York.
  const isOverdue =
    po?.isOverdue ??
    (!!po?.expectedDate &&
      !po.deliveryDate &&
      !isCancelled &&
      isBeforeBusinessToday(po.expectedDate));
  const overdueDays = isOverdue ? (po?.overdueDays ?? businessDaysSince(po?.expectedDate)) : 0;

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
      <div className="container-fluid max-w-full overflow-x-clip pb-5">
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
  const amountPaid = purchaseOrderAmountPaid(po);
  const invoiceTotal = linkedInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.totalAmount ?? 0),
    0
  );
  const balanceDue = Math.max(totalCommitment - amountPaid, 0);
  // The server's figure when it sends one, so the dialog holds the amount to
  // the same balance the API checks.
  const payableBalance = po.paymentSummary
    ? Math.max(toCommercialDecimal(po.paymentSummary.balance).toNumber(), 0)
    : balanceDue;
  const canMarkPayments = can('monthlyBills', 'mark-payment');
  const canRecordPayment = canMarkPayments && (isIssued || isDelivered) && payableBalance > 0;
  const { subtotal, negotiatedDiscount } = purchaseOrderTotals;
  const readableRfq = po.rfq?.rfqNumber ?? po.rfq?.title ?? po.rfqId;
  const tradeLabel =
    po.tradeCategoryLabel ??
    (po.tradeCategory ? TRADE_CATEGORY_LABELS[po.tradeCategory] : undefined);
  const vendorEmail = typeof po.vendor?.email === 'string' ? po.vendor.email : undefined;

  return (
    <div className="container-fluid max-w-full overflow-x-clip pb-5">
      {/* ---- Toolbar ---- */}
      <DetailPageHeader
        title={po.poNumber ?? 'Draft PO'}
        status={po.status ? { value: statusName, label: po.status.label } : undefined}
        badges={[
          ...(po.tradeCategory
            ? [
                {
                  label: tradeLabel ?? '',
                  variant: TRADE_CATEGORY_BADGE_VARIANTS[po.tradeCategory] ?? 'primary',
                },
              ]
            : []),
          ...(isOverdue
            ? [{ label: 'Overdue', variant: 'destructive' as const, icon: AlertTriangle }]
            : []),
          ...importedBadges(po.importSource),
        ]}
        references={
          po.rfqId
            ? [{ label: readableRfq ?? 'RFQ', to: `/app/project/${projectId}/rfqs/${po.rfqId}` }]
            : undefined
        }
        titleSlot={<FeatureEmailSentBadge sentAt={po.sentAt} log={po.latestEmailLog} />}
        actions={[
          { label: 'Generate PDF', icon: FileText, onClick: openPdfOptions },
          { label: 'Email PO', icon: Mail, onClick: openEmailFlow, enabled: canEmailPO },
          {
            label: 'Issue PO',
            icon: CheckCircle2,
            placement: 'primary',
            onClick: () => setIssueOpen(true),
            enabled: canIssue,
          },
          {
            label: 'Mark Delivered',
            icon: Truck,
            enabled: canRecordDelivery,
            onClick: () => {
              setDeliveryDate(todayDateOnly());
              setDeliveryOpen(true);
            },
          },
          {
            label: 'Record Payment',
            icon: Banknote,
            onClick: () => setRecordPaymentOpen(true),
            enabled: canRecordPayment,
          },
          { label: 'Edit', icon: Pencil, to: 'edit', enabled: canEdit },
          {
            label: 'Cancel PO',
            icon: XCircle,
            placement: 'overflow',
            enabled: canCancel,
            onClick: () => {
              setCancelReason('');
              setCancelOpen(true);
            },
          },
        ]}
        panel={{ open: sidebarOpen, onOpen: () => setSidebarOpen(true), label: 'Details' }}
      />

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-5">
          {/* ---- Overdue alert ---- */}
          {isOverdue && (
            <div className="relative flex flex-col gap-4 rounded-xl border border-border border-s-4 border-s-destructive bg-destructive-soft p-5 shadow-xs shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-destructive shadow-xs border border-border">
                  <ShieldAlert className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                      Purchase Alert
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Purchase Order is Overdue</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Expected delivery was{' '}
                    <span className="font-semibold text-foreground">
                      {formatDateOnly(po.expectedDate, undefined, '-')}
                    </span>
                    . Delivery has not been recorded.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 sm:pl-8 sm:border-s sm:border-border/60">
                <div className="text-left sm:text-right">
                  <h2 className="text-5xl font-black text-destructive tracking-tight leading-none tabular-nums">
                    {overdueDays}
                  </h2>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                    days overdue
                  </div>
                </div>
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
              description="All recorded payments"
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
                      {formatDateOnly(po.expectedDate, undefined, '-')}
                    </ProjectDetailField>
                    <ProjectDetailField label="Address">{po.address ?? '-'}</ProjectDetailField>
                    <ProjectDetailField label="Ship To" className="lg:row-span-2">
                      {po.shipToAddress ?? '-'}
                    </ProjectDetailField>
                    <ProjectDetailField label="Delivery Date">
                      {formatDateOnly(po.deliveryDate, undefined, '-')}
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
              <PurchaseOrderDetailPaymentsCard
                purchaseOrderId={po.id}
                payments={po.poPayments ?? []}
                poNumber={po.poNumber ?? ''}
                canDeleteManualPayments={canMarkPayments}
              />

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
            <ProjectActivityPanel
              entityType="purchaseOrder"
              entityId={poId}
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
                  <InfoRow label="Subtotal">{formatCurrency(subtotal)}</InfoRow>
                  {negotiatedDiscount !== 0 && (
                    <InfoRow label="Negotiated Discount">
                      -{formatCurrency(negotiatedDiscount)}
                    </InfoRow>
                  )}
                  <Separator className="my-1" />
                  <InfoRow label="Total">
                    <span className="font-semibold">{formatCurrency(poTotal)}</span>
                  </InfoRow>
                  {scoTotal > 0 && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow label="SCO Total">+{formatCurrency(scoTotal)}</InfoRow>
                      <InfoRow label="Total Commitment">{formatCurrency(totalCommitment)}</InfoRow>
                    </>
                  )}
                  <Separator className="my-2" />
                  {linkedInvoices.length > 0 && (
                    <InfoRow label="Invoice Total">{formatCurrency(invoiceTotal)}</InfoRow>
                  )}
                  {/* Payments, not invoices: a PO paid without any - every imported
                      one - still shows what was paid and what is left. */}
                  <InfoRow label="Amount Paid">{formatCurrency(amountPaid)}</InfoRow>
                  <InfoRow label="Balance Due">{formatCurrency(balanceDue)}</InfoRow>
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
                          {formatDateOnly(po.expectedDate)}
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
                        <div className="text-sm font-medium">{formatDateOnly(po.deliveryDate)}</div>
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

            {po.importSource ? <ImportSourcePanel source={po.importSource} /> : null}
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
          await refetchPoDetail();
          handleEmailOpenChange(false);
        }}
      />

      {/* ---- Issue PO confirmation ---- */}
      <RecordPoPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        purchaseOrder={{
          id: po.id,
          poNumber: po.poNumber ?? '',
          vendorName: po.vendor?.name ?? '-',
          balance: payableBalance,
          issuedAt: po.issuedAt,
        }}
      />

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
          onSubmit={(payload) => {
            uploadManager.enqueueUpload(payload, {
              label: 'Purchase order attachment',
              onUploaded: async (uploaded) => {
                await addAttachmentMutation.mutateAsync({
                  poId,
                  data: { documentId: uploaded.id },
                });
              },
            });
            setUploadOpen(false);
          }}
          isSubmitting={false}
        />
      )}
    </div>
  );
}
