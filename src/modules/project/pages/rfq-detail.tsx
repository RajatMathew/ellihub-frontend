import { useState } from 'react';

import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  Mail,
  MoreHorizontal,
  PanelRightOpen,
  Paperclip,
  Pencil,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
  Trophy,
  Upload,
  Users,
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
import { Field, FieldLabel } from '@app/components/ui/field';
import { Input, InputWrapper } from '@app/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@app/components/ui/select';
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { Textarea } from '@app/components/ui/textarea';
import { formatCurrency, formatDate } from '@app/lib/helpers';

import { useQuery } from '@tanstack/react-query';
import { UploadFileDialog } from '@modules/files/components/upload-file-dialog';
import { filesApi } from '@modules/files/api/files.api';
import { useDownloadFile, useUploadFileMutation } from '@modules/files/hooks/files.hooks';
import { DetailSidebar } from '@modules/directory/components';
import { InfoRow } from '@modules/project/components/info-row';
import { useVendorsQuery } from '@modules/directory/hooks/vendors.hooks';
import { BIDDING_TYPE_LABELS, getRfqStatusVariant } from '../constants/rfq.constants';
import { FileDropZone } from '@app/components/ui/file-drop-zone';
import {
  useAddQuoteAttachmentMutation,
  useAddRFQAttachmentMutation,
  useAwardRFQMutation,
  useBidComparisonQuery,
  useCancelRFQMutation,
  useChangeRFQStatusMutation,
  useCreateQuoteMutation,
  useDeclineInviteMutation,
  useDeleteRFQMutation,
  useGeneratePOMutation,
  useInviteVendorsMutation,
  usePublishRFQMutation,
  useRFQDetailQuery,
  useRFQStatusesQuery,
  useRemoveRFQAttachmentMutation,
  useUnawardRFQMutation,
  useUpdateQuoteMutation,
  useVoidAwardMutation,
} from '../hooks';
import { useProjectFolderQuery } from '../hooks/use-project-folder';

/* ---- Quote Document Preview ---- */

function QuoteDocPreview({ documentId, name, mimeType }: { documentId: string; name: string; mimeType?: string }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['file-preview', documentId],
    queryFn: () => filesApi.getDownloadLink(documentId),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000,
  });

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
  const { projectId = '', rfqId = '' } = useParams<{ projectId: string; rfqId: string }>();
  const navigate = useNavigate();

  const { data: rfq, isLoading } = useRFQDetailQuery(rfqId);

  const publishMutation = usePublishRFQMutation();
  const cancelMutation = useCancelRFQMutation();
  const awardMutation = useAwardRFQMutation();
  const voidMutation = useVoidAwardMutation();
  const unawardMutation = useUnawardRFQMutation();
  const generatePOMutation = useGeneratePOMutation();
  const deleteMutation = useDeleteRFQMutation();
  const inviteVendorsMutation = useInviteVendorsMutation();
  const createQuoteMutation = useCreateQuoteMutation();
  const updateQuoteMutation = useUpdateQuoteMutation();
  const changeStatusMutation = useChangeRFQStatusMutation();
  const declineInviteMutation = useDeclineInviteMutation();
  const addAttachmentMutation = useAddRFQAttachmentMutation();
  const addQuoteAttachmentMutation = useAddQuoteAttachmentMutation();
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
  const [quoteVendorId, setQuoteVendorId] = useState('');
  const [quoteAmount, setQuoteAmount] = useState<number | ''>('');
  const [quoteLeadTime, setQuoteLeadTime] = useState('');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteFile, setQuoteFile] = useState<File | null>(null);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Void award dialog
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Award dialog
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardQuoteIds, setAwardQuoteIds] = useState<string[]>([]);

  // Upload attachment dialog
  const [uploadOpen, setUploadOpen] = useState(false);

  // Bid comparison dialog
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const { data: bidComparison } = useBidComparisonQuery(rfqId, comparisonOpen);

  // Vendor data for dialogs
  const { data: vendorsData } = useVendorsQuery({ page: 1, limit: 1000 });
  const vendors = vendorsData?.data ?? [];

  const statusName = rfq?.status?.name ?? '';
  const isDraft = statusName === 'DRAFT';
  const isPublished = statusName === 'PUBLISHED';
  const isEvaluation = statusName === 'EVALUATION';
  const isAwarded = statusName === 'AWARDED';
  const isTerminal = statusName === 'CANCELLED' || statusName === 'VOID';

  const isActionPending =
    publishMutation.isPending ||
    cancelMutation.isPending ||
    awardMutation.isPending ||
    voidMutation.isPending ||
    inviteVendorsMutation.isPending ||
    createQuoteMutation.isPending ||
    updateQuoteMutation.isPending ||
    unawardMutation.isPending ||
    generatePOMutation.isPending ||
    changeStatusMutation.isPending ||
    addAttachmentMutation.isPending ||
    removeAttachmentMutation.isPending;

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading RFQ...</div>
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

  const quoteGrandTotals = quotes
    .map((q) => q.grandTotal)
    .filter((v): v is number => v != null);
  const lowestQuote = quoteGrandTotals.length > 0 ? Math.min(...quoteGrandTotals) : null;
  const highestQuote = quoteGrandTotals.length > 0 ? Math.max(...quoteGrandTotals) : null;

  const deliverablesTotal = deliverables.reduce(
    (sum, d) => sum + (d.estimatedTotal ?? (d.estimatedUnitPrice ?? 0) * d.quantity),
    0,
  );

  // Build a map of vendorId → quote
  const quoteByVendor = new Map<string, (typeof quotes)[number]>();
  for (const q of quotes) {
    if (q.vendor) quoteByVendor.set(q.vendor.id, q);
  }

  // IDs of vendors already invited
  const alreadyInvitedIds = new Set(invites.map((inv) => inv.vendor?.id).filter(Boolean));

  function openQuoteDialog(vendorId: string, existingQuoteId?: string) {
    setQuoteVendorId(vendorId);
    setEditingQuoteId(existingQuoteId ?? null);
    // Pre-fill if editing existing quote
    if (existingQuoteId) {
      const eq = quotes.find((q) => q.id === existingQuoteId);
      setQuoteAmount(eq?.grandTotal ?? eq?.totalAmount ?? '');
      setQuoteLeadTime(eq?.notes ?? '');
    } else {
      setQuoteAmount('');
      setQuoteLeadTime('');
    }
    setQuoteOpen(true);
  }

  function resetQuoteDialog() {
    setQuoteOpen(false);
    setQuoteVendorId('');
    setQuoteAmount('');
    setQuoteLeadTime('');
    setEditingQuoteId(null);
    setQuoteFile(null);
  }

  function handleAwardFromTable(quoteId: string) {
    setAwardQuoteIds([quoteId]);
    setAwardOpen(true);
  }

  function handleUnaward() {
    unawardMutation.mutate(rfqId);
  }

  return (
    <div className="container-fluid py-7.5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Back to RFQs
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ToolbarPageTitle>{rfq.title}</ToolbarPageTitle>
              {rfq.status && rfqStatuses && rfqStatuses.length > 0 ? (
                <Select
                  value={rfq.status.id}
                  onValueChange={(statusId) => {
                    if (statusId !== rfq.status?.id) {
                      changeStatusMutation.mutate({ id: rfqId, statusId });
                    }
                  }}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 px-2 text-xs font-medium shadow-none">
                    <Badge variant={getRfqStatusVariant(rfq.status.name)} appearance="light" size="sm">
                      {rfq.status.label}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {rfqStatuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : rfq.status ? (
                <Badge variant={getRfqStatusVariant(rfq.status.name)} appearance="light" size="sm">
                  {rfq.status.label}
                </Badge>
              ) : null}
              {rfq.rfqNumber && (
                <span className="text-sm text-muted-foreground">RFQ #{rfq.rfqNumber}</span>
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
            {isDraft && (
              <Button size="sm" onClick={() => setPublishOpen(true)}>
                <Send className="size-4" />
                Publish
              </Button>
            )}
            {(isPublished || isEvaluation || isAwarded) && quotes.length > 0 && (
              <Button size="sm" onClick={() => setAwardOpen(true)}>
                <Trophy className="size-4" />
                Award
              </Button>
            )}

            {!isTerminal && (
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
                      onClick={() => { setCancelReason(''); setCancelOpen(true); }}
                    >
                      Cancel RFQ
                    </DropdownMenuItem>
                  )}
                  {isAwarded && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => { setVoidReason(''); setVoidOpen(true); }}
                    >
                      Void Award
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
      <div className="flex gap-6 pt-5">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={<ShieldAlert className="size-6 text-muted-foreground" />}
              bgClass="bg-muted/50"
              label="Bidding Type"
              value={BIDDING_TYPE_LABELS[rfq.biddingType] ?? rfq.biddingType}
            />
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
          {!isDraft && (
            <div className="flex items-center gap-3">
              {quotes.length >= 2 && (
                <Button variant="outline" size="sm" onClick={() => setComparisonOpen(true)}>
                  <FileText className="size-4" />
                  Compare {quotes.length} Quotes
                </Button>
              )}
              {invites.length > 0 && (
                <Button variant="outline" size="sm">
                  <Mail className="size-4" />
                  Email All Vendors
                </Button>
              )}
            </div>
          )}

          {/* Vendor Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Vendors
              </CardTitle>
              {!isTerminal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setInviteVendorIds([]); setInviteOpen(true); }}
                >
                  <Plus className="size-4" />
                  Invite Vendor
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {invites.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Vendor</th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Status</th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">Quote Amount</th>
                        <th className="pb-2 pr-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Lead Time</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((inv) => {
                        const vendor = inv.vendor;
                        const declined = !!inv.declinedToQuote;
                        const hasQuote = !!inv.hasSubmittedQuote;
                        const vendorQuote = vendor ? quoteByVendor.get(vendor.id) : null;
                        const grandTotal = vendorQuote?.grandTotal;
                        const isVendorAwarded = !!vendorQuote?.isAwarded;
                        const vendorPO = rfq.purchaseOrders?.find((po) => po.vendorId === vendor?.id);
                        const leadTimeNotes = vendorQuote?.notes;

                        return (
                          <tr key={inv.id} className="border-b last:border-0">
                            <td className="py-2.5 pr-4">
                              <div className="font-medium">{vendor?.name ?? '—'}</div>
                              {vendor?.email && (
                                <div className="text-xs text-muted-foreground">{vendor.email}</div>
                              )}
                            </td>
                            <td className="py-2.5 pr-4">
                              {isTerminal ? (
                                declined ? (
                                  <Badge variant="destructive" appearance="light" size="sm">Declined</Badge>
                                ) : hasQuote ? (
                                  <Badge variant="primary" appearance="light" size="sm">Quoted</Badge>
                                ) : (
                                  <Badge variant="secondary" appearance="light" size="sm">Waiting</Badge>
                                )
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button type="button" className="cursor-pointer">
                                      {isVendorAwarded ? (
                                        <Badge variant="success" appearance="light" size="sm">Awarded <ChevronDown className="ml-0.5 size-3 inline" /></Badge>
                                      ) : declined ? (
                                        <Badge variant="destructive" appearance="light" size="sm">Declined <ChevronDown className="ml-0.5 size-3 inline" /></Badge>
                                      ) : hasQuote ? (
                                        <Badge variant="primary" appearance="light" size="sm">Quoted <ChevronDown className="ml-0.5 size-3 inline" /></Badge>
                                      ) : (
                                        <Badge variant="secondary" appearance="light" size="sm">Waiting <ChevronDown className="ml-0.5 size-3 inline" /></Badge>
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-44">
                                    {!isVendorAwarded && !hasQuote && !declined && vendor && (
                                      <DropdownMenuItem onClick={() => openQuoteDialog(vendor.id)}>
                                        <Upload className="size-4" />
                                        Upload Quote
                                      </DropdownMenuItem>
                                    )}
                                    {!isVendorAwarded && hasQuote && vendorQuote && vendor && (
                                      <DropdownMenuItem onClick={() => openQuoteDialog(vendor.id, vendorQuote.id)}>
                                        <Pencil className="size-4" />
                                        Edit Quote
                                      </DropdownMenuItem>
                                    )}
                                    {!isVendorAwarded && hasQuote && vendorQuote && grandTotal != null && grandTotal > 0 && (isPublished || isEvaluation || isAwarded) && (
                                      <DropdownMenuItem onClick={() => handleAwardFromTable(vendorQuote.id)}>
                                        <Trophy className="size-4" />
                                        Award
                                      </DropdownMenuItem>
                                    )}
                                    {isVendorAwarded && (
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => handleUnaward()}
                                      >
                                        <XCircle className="size-4" />
                                        Unaward
                                      </DropdownMenuItem>
                                    )}
                                    {!declined && !isVendorAwarded && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => {
                                            declineInviteMutation.mutate({
                                              rfqId,
                                              inviteId: inv.id,
                                              data: {},
                                            });
                                          }}
                                        >
                                          <XCircle className="size-4" />
                                          Decline
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                            <td className="py-2.5 pr-4 text-right tabular-nums">
                              {grandTotal != null ? formatCurrency(grandTotal) : '—'}
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground text-sm">
                              {leadTimeNotes || '—'}
                            </td>
                            <td className="py-2.5 text-right">
                              {!isTerminal && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" mode="icon" className="size-7">
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    {!hasQuote && !declined && vendor && (
                                      <DropdownMenuItem onClick={() => openQuoteDialog(vendor.id)}>
                                        <Upload className="size-4" />
                                        Upload Quote
                                      </DropdownMenuItem>
                                    )}
                                    {hasQuote && vendorQuote && vendor && (
                                      <DropdownMenuItem onClick={() => openQuoteDialog(vendor.id, vendorQuote.id)}>
                                        <Pencil className="size-4" />
                                        Edit Quote
                                      </DropdownMenuItem>
                                    )}
                                    {!isVendorAwarded && hasQuote && vendorQuote && grandTotal != null && grandTotal > 0 && (
                                      <DropdownMenuItem onClick={() => handleAwardFromTable(vendorQuote.id)}>
                                        <Trophy className="size-4" />
                                        Award
                                      </DropdownMenuItem>
                                    )}
                                    {isVendorAwarded && !vendorPO && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          generatePOMutation.mutate({ rfqId, data: { vendorInviteId: inv.id } });
                                        }}
                                      >
                                        <FileText className="size-4" />
                                        Create PO
                                      </DropdownMenuItem>
                                    )}
                                    {isVendorAwarded && vendorPO && (
                                      <DropdownMenuItem asChild>
                                        <Link to={`../../purchase-orders/${vendorPO.id}`}>
                                          <FileText className="size-4" />
                                          View PO
                                        </Link>
                                      </DropdownMenuItem>
                                    )}
                                    {isVendorAwarded && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => handleUnaward()}
                                        >
                                          <XCircle className="size-4" />
                                          Unaward
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {!declined && !isVendorAwarded && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => {
                                            declineInviteMutation.mutate({ rfqId, inviteId: inv.id, data: {} });
                                          }}
                                        >
                                          <XCircle className="size-4" />
                                          Decline
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Users className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No vendors invited yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Attachments ({attachments.length})
              </CardTitle>
              {!isTerminal && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!rfqFolderQuery.data}
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="size-4" />
                  Add Attachment
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Paperclip className="size-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        {att.document?.id ? (
                          <button
                            type="button"
                            className="text-sm font-medium truncate text-primary hover:underline block max-w-full text-left"
                            onClick={() => downloadFile.mutate(att.document!)}
                          >
                            {att.document.name ?? 'Untitled Document'}
                          </button>
                        ) : (
                          <div className="text-sm font-medium truncate">
                            {att.document?.name ?? 'File'}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">Document</span>
                      {!isTerminal && (
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="sm"
                          disabled={removeAttachmentMutation.isPending}
                          onClick={() => removeAttachmentMutation.mutate({ rfqId, attachmentId: att.id })}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Paperclip className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No attachments.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {rfqFolderQuery.data && (
            <UploadFileDialog
              open={uploadOpen}
              onOpenChange={setUploadOpen}
              parentId={rfqFolderQuery.data}
              onSubmit={async (payload) => {
                try {
                  const fileItem = await uploadFileMutation.mutateAsync(payload);
                  await addAttachmentMutation.mutateAsync({ rfqId, data: { fileId: fileItem.id } });
                } finally {
                  setUploadOpen(false);
                }
              }}
              isSubmitting={uploadFileMutation.isPending || addAttachmentMutation.isPending}
            />
          )}

          {/* Required Deliverables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Required Deliverables ({deliverables.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliverables.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase w-8">#</th>
                        <th className="pb-2 pr-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Description</th>
                        <th className="pb-2 pr-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase text-right">Qty</th>
                        <th className="pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliverables.map((d, idx) => (
                          <tr key={d.id} className="border-b last:border-0">
                            <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                            <td className="py-2.5 pr-3">
                              <div className="font-medium">{d.description}</div>
                              {d.specifications && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {d.specifications}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{d.quantity}</td>
                            <td className="py-2.5">{d.unit}</td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No deliverables.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Scope */}
          {rfq.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Detailed Scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{rfq.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <div className="space-y-6 pt-2">
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
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
                  <InfoRow label="Bid Deadline">{formatDate(rfq.bidDeadline)}</InfoRow>
                  <InfoRow label="Bidding Type">
                    {BIDDING_TYPE_LABELS[rfq.biddingType] ?? rfq.biddingType}
                  </InfoRow>
                  {rfq.minimumVendors != null && (
                    <InfoRow label="Min. Vendors">{rfq.minimumVendors}</InfoRow>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
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
                    <InfoRow label="Awarded Vendor">
                      {rfq.awardedVendor.name}
                    </InfoRow>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
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
                          {rfq.awardedVendor
                            ? rfq.awardedVendor.name
                            : 'Vendor awarded'}
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {rfq.voidReason}
                          </p>
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
      <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-row items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg">Bid Comparison</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Comparing {bidComparison?.quotes.length ?? 0} quote{(bidComparison?.quotes.length ?? 0) !== 1 ? 's' : ''} from {invites.length} vendor{invites.length !== 1 ? 's' : ''} for RFQ #{rfq.rfqNumber}
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              {rfq.createdAt && (
                <div>
                  <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Issue Date</div>
                  <div className="font-medium">{formatDate(rfq.createdAt)}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Due Date</div>
                <div className="font-medium">{formatDate(rfq.bidDeadline)}</div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-x-auto overflow-y-auto mt-4">
            {bidComparison ? (
              <div className="flex gap-4 min-w-max pb-4">
                {/* Show all invites — vendors with quotes, without quotes, and declined */}
                {invites.map((inv) => {
                  const vendor = inv.vendor;
                  const declined = !!inv.declinedToQuote;
                  const bcQuote = bidComparison.quotes.find((q) => q.vendorId === vendor?.id);
                  const hasQuote = !!bcQuote;

                  return (
                    <div
                      key={inv.id}
                      className="w-72 shrink-0 rounded-lg border bg-card flex flex-col"
                    >
                      {/* Quote document area */}
                      <div className="h-64 border-b bg-muted/30 flex items-center justify-center rounded-t-lg overflow-hidden">
                        {hasQuote && bcQuote?.attachments?.length ? (
                          <QuoteDocPreview
                            documentId={bcQuote.attachments[0].document.id}
                            name={bcQuote.attachments[0].document.name}
                            mimeType={bcQuote.attachments[0].document.mimeType}
                          />
                        ) : hasQuote ? (
                          <div className="text-center p-4">
                            <FileText className="size-12 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No document attached</p>
                          </div>
                        ) : declined ? (
                          <div className="text-center">
                            <XCircle className="size-12 text-destructive/40 mx-auto mb-2" />
                            <p className="text-sm font-medium text-destructive">Declined Bid</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Clock className="size-12 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Not Submitted</p>
                          </div>
                        )}
                      </div>

                      {/* Vendor info footer */}
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{vendor?.name ?? '—'}</div>
                          {hasQuote && bcQuote ? (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>Total: {formatCurrency(Number(bcQuote.grandTotal ?? 0))}</span>
                              {bcQuote.leadTimeDays && (
                                <span>Lead: {bcQuote.leadTimeDays} days</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {declined ? '(Declined)' : '(Not Submitted)'}
                            </p>
                          )}
                        </div>
                        {hasQuote && bcQuote ? (
                          (() => {
                            const isBcQuoteAwarded = quotes.find((q) => q.id === bcQuote.quoteId)?.isAwarded;
                            return isBcQuoteAwarded ? (
                              <Badge variant="success" appearance="light" size="sm" className="shrink-0">
                                Awarded
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                className="shrink-0"
                                onClick={() => {
                                  setComparisonOpen(false);
                                  setAwardQuoteIds([bcQuote.quoteId]);
                                  setAwardOpen(true);
                                }}
                              >
                                Award Bid
                              </Button>
                            );
                          })()
                        ) : !hasQuote && !declined ? (
                          <Button variant="outline" size="sm" className="shrink-0" disabled>
                            Award Bid
                          </Button>
                        ) : declined ? (
                          <span className="text-xs text-destructive font-medium shrink-0">Declined</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-muted-foreground">Loading comparison...</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Upload / Edit Quotation dialog ---- */}
      <Dialog
        open={quoteOpen}
        onOpenChange={(open) => { if (!open) resetQuoteDialog(); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <DialogTitle>{editingQuoteId ? 'Edit Quotation' : 'Upload Quotation'}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
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
                  onChange={(e) =>
                    setQuoteAmount(e.target.value === '' ? '' : e.target.valueAsNumber)
                  }
                />
              </InputWrapper>
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                Lead Time (Days)
              </FieldLabel>
              <InputWrapper>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 30"
                  value={quoteLeadTime}
                  onChange={(e) => setQuoteLeadTime(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                  autoComplete="off"
                />
              </InputWrapper>
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                Quote Document
              </FieldLabel>
              <FileDropZone
                value={quoteFile}
                onChange={setQuoteFile}
                accept=".pdf,.xlsx,.docx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetQuoteDialog}>
              Cancel
            </Button>
            <Button
              disabled={!quoteAmount || quoteAmount <= 0 || createQuoteMutation.isPending || updateQuoteMutation.isPending || uploadFileMutation.isPending}
              onClick={async () => {
                if (!quoteAmount || quoteAmount <= 0 || deliverables.length === 0) return;

                const totalQty = deliverables.reduce((s, d) => s + (d.quantity || 1), 0);
                const perUnitPrice = totalQty > 0 ? quoteAmount / totalQty : quoteAmount;
                const items = deliverables.map((d) => ({
                  deliverableId: d.id,
                  unitPrice: perUnitPrice,
                  quantity: d.quantity || 1,
                  unit: d.unit || 'EA',
                }));

                const leadTimeDays = quoteLeadTime
                  ? parseInt(quoteLeadTime, 10) || undefined
                  : undefined;

                const attachFileToQuote = async (quoteId: string) => {
                  if (quoteFile && rfqFolderQuery.data) {
                    try {
                      const dotIdx = quoteFile.name.lastIndexOf('.');
                      const docName = dotIdx > 0 ? quoteFile.name.slice(0, dotIdx) : quoteFile.name;
                      const fileItem = await uploadFileMutation.mutateAsync({
                        file: quoteFile,
                        data: {
                          name: docName,
                          parentId: rfqFolderQuery.data,
                          mimeType: quoteFile.type || undefined,
                          size: quoteFile.size,
                        },
                      });
                      addQuoteAttachmentMutation.mutate({
                        rfqId,
                        quoteId,
                        data: { fileId: fileItem.id },
                      });
                    } catch {
                      // Quote was created but file upload failed — user can retry
                    }
                  }
                };

                if (editingQuoteId) {
                  updateQuoteMutation.mutate(
                    {
                      rfqId,
                      quoteId: editingQuoteId,
                      data: {
                        lineItems: items,
                        leadTimeDays: leadTimeDays ?? null,
                        notes: quoteLeadTime || null,
                      },
                    },
                    {
                      onSuccess: () => {
                        attachFileToQuote(editingQuoteId);
                        resetQuoteDialog();
                      },
                    },
                  );
                } else {
                  createQuoteMutation.mutate(
                    {
                      rfqId,
                      data: {
                        vendorId: quoteVendorId,
                        lineItems: items,
                        leadTimeDays,
                        notes: quoteLeadTime || undefined,
                      },
                    },
                    {
                      onSuccess: (result: any) => {
                        const newQuoteId = result?.id;
                        if (newQuoteId) attachFileToQuote(newQuoteId);
                        resetQuoteDialog();
                      },
                    },
                  );
                }
              }}
            >
              {createQuoteMutation.isPending || updateQuoteMutation.isPending || uploadFileMutation.isPending
                ? 'Saving...'
                : editingQuoteId ? 'Update Quote' : 'Submit Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Invite vendors dialog ---- */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) { setInviteOpen(false); setInviteVendorIds([]); } }}>
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
                  <label key={v.id} className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer hover:bg-accent rounded px-1.5">
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
            <p className="text-xs text-muted-foreground">
              {inviteVendorIds.length} selected
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteOpen(false); setInviteVendorIds([]); }}>
              Cancel
            </Button>
            <Button
              disabled={inviteVendorIds.length === 0 || inviteVendorsMutation.isPending}
              onClick={() => {
                inviteVendorsMutation.mutate(
                  { rfqId, data: { vendorIds: inviteVendorIds, sendInviteEmails: true } },
                  { onSuccess: () => { setInviteOpen(false); setInviteVendorIds([]); } },
                );
              }}
            >
              {inviteVendorsMutation.isPending ? 'Inviting...' : 'Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Publish dialog ---- */}
      <Dialog open={publishOpen} onOpenChange={(open) => { if (!open) { setPublishOpen(false); setSelectedVendorIds([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select vendors to invite. The RFQ requires at least {rfq.minimumVendors ?? 3} vendor(s).
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 rounded-md border p-3">
              {vendors.map((v) => (
                <label key={v.id} className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer hover:bg-accent rounded px-1.5">
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
            <Button variant="outline" onClick={() => { setPublishOpen(false); setSelectedVendorIds([]); }}>
              Cancel
            </Button>
            <Button
              disabled={selectedVendorIds.length < (rfq.minimumVendors ?? 3) || isActionPending}
              onClick={() => {
                publishMutation.mutate(
                  { id: rfqId, data: { vendorIds: selectedVendorIds, sendInviteEmails: true } },
                  { onSuccess: () => { setPublishOpen(false); setSelectedVendorIds([]); } },
                );
              }}
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish & Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Cancel dialog ---- */}
      <Dialog open={cancelOpen} onOpenChange={(open) => { if (!open) { setCancelOpen(false); setCancelReason(''); } }}>
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
            <Button variant="outline" onClick={() => { setCancelOpen(false); setCancelReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={cancelReason.length < 1 || isActionPending}
              onClick={() => {
                cancelMutation.mutate(
                  { id: rfqId, data: { cancellationReason: cancelReason } },
                  { onSuccess: () => { setCancelOpen(false); setCancelReason(''); } },
                );
              }}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel RFQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Void award dialog ---- */}
      <Dialog open={voidOpen} onOpenChange={(open) => { if (!open) { setVoidOpen(false); setVoidReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Award</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Provide a reason for voiding the award on <strong>{rfq.rfqNumber ?? rfq.title}</strong>.
            </p>
            <Textarea
              placeholder="Void reason..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVoidOpen(false); setVoidReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={voidReason.length < 1 || isActionPending}
              onClick={() => {
                voidMutation.mutate(
                  { id: rfqId, data: { voidReason } },
                  { onSuccess: () => { setVoidOpen(false); setVoidReason(''); } },
                );
              }}
            >
              {voidMutation.isPending ? 'Voiding...' : 'Void Award'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Award dialog ---- */}
      <Dialog open={awardOpen} onOpenChange={(open) => { if (!open) { setAwardOpen(false); setAwardQuoteIds([]); } }}>
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
                          prev.includes(q.id)
                            ? prev.filter((id) => id !== q.id)
                            : [...prev, q.id],
                        );
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{q.vendor?.name ?? 'Unknown Vendor'}</span>
                        {currentlyAwarded && (
                          <Badge variant="success" appearance="light" size="sm">Awarded</Badge>
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
            <Button variant="outline" onClick={() => { setAwardOpen(false); setAwardQuoteIds([]); }}>
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
                      id: rfqId,
                      data: {
                        awardedQuoteId: qId,
                        awardedVendorId: selectedQuote.vendor?.id ?? '',
                        awardedAmount: selectedQuote.grandTotal ?? 0,
                      },
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
            This will permanently delete{' '}
            <strong>{rfq.rfqNumber ?? rfq.title}</strong>. This cannot be undone.
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
    </div>
  );
}

