// ---------------------------------------------------------------------------
// RFQ Detail Page
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';

import {
  ArrowLeft,
  BarChart2,
  FileText,
  Lock,
  Mail,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';

import { BidComparisonModal } from './bid-comparison-modal';
import { DetailsSidebar } from './details-sidebar';
import { StatCard, StatusBadge, VendorInitial } from './shared';
import type { RfqDetail, VendorRow } from './types';
import { UploadQuotationModal } from './upload-quotation-modal';

// ---------------------------------------------------------------------------
// Mock / Hardcoded data (temporary)
// ---------------------------------------------------------------------------

const MOCK_RFQ: RfqDetail = {
  rfqNumber: '2025-001',
  title: 'Custom Millwork Package - Computer Lab Casework',
  status: 'PUBLISHED',
  tradeCategory: 'FABRICATION',
  issueDate: '2025-01-08',
  responseDue: '2025-02-10',
  createdBy: { name: 'John Martinez', role: 'ASSISTANT PM', initials: 'JM' },
  projectName: 'P.S. 397B',
  projectId: '14120 • SCA',
  notice: 'AWI Premium Grade required. Lead time critical.',
  vendorsInvited: 4,
  quotesReceived: 2,
  lowestQuote: 58792.5,
};

const MOCK_VENDORS: VendorRow[] = [
  {
    id: '1',
    name: 'Mid-Island Millwork',
    email: 'quotes@midislandmillwork.com',
    status: 'QUOTED',
    quoteAmount: 58792.5,
    leadTime: '6 weeks',
  },
  {
    id: '2',
    name: 'Brooklyn Cabinet Co.',
    email: 'bid@brooklyncabinet.com',
    status: 'QUOTED',
    quoteAmount: 63400.0,
    leadTime: '8 weeks',
  },
  {
    id: '3',
    name: 'Queens Wood Products',
    email: 'info@queenswood.com',
    status: 'WAITING',
    quoteAmount: null,
    leadTime: null,
  },
  {
    id: '4',
    name: 'Metro Casework Inc.',
    email: 'rfq@metrocasework.com',
    status: 'DECLINED',
    quoteAmount: null,
    leadTime: null,
  },
];

const MOCK_ATTACHMENTS = [
  { id: '1', name: 'RFQ-2025-001-Drawings.pdf', size: '2.4 MB' },
  { id: '2', name: 'Casework-Specs-AWI-Premium.pdf', size: '1.1 MB' },
];

const MOCK_DELIVERABLES = [
  { id: '1', description: 'Instructor Station - Type L1', unit: 'EA', qty: 2 },
  { id: '2', description: 'Student Workstation - Type S4', unit: 'EA', qty: 12 },
  { id: '3', description: 'Storage Cabinet - Type C2 (Tall)', unit: 'EA', qty: 6 },
  { id: '4', description: 'Solid Surface Countertop - Black Pearl', unit: 'LF', qty: 112 },
  { id: '5', description: 'Hardware Kit (Premium Grade)', unit: 'SET', qty: 40 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// ThreeDotMenu — vendor row action menu
// ---------------------------------------------------------------------------

function ThreeDotMenu({ onUpdateQuote }: { onUpdateQuote?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem className="gap-2" onClick={onUpdateQuote}>
          <Pencil className="size-3.5" />
          Update Quote
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
          <FileText className="size-3.5" />
          Mark as Declined
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RfqDetailPage() {
  const { projectId, rfqNumber: _rfqNumber } = useParams<{
    projectId: string;
    rfqNumber: string;
  }>();
  // _rfqNumber will be used to fetch real data from the API (mock data shown for now)
  const navigate = useNavigate();
  const rfq = MOCK_RFQ;

  const backPath = projectId ? `/project/${projectId}/rfqs` : '/app/rfqs';

  const [compareOpen, setCompareOpen] = useState(false);
  const handleCloseCompare = useCallback(() => setCompareOpen(false), []);

  const [uploadQuoteVendor, setUploadQuoteVendor] = useState<VendorRow | null>(null);
  const handleCloseUploadQuote = useCallback(() => setUploadQuoteVendor(null), []);

  return (
    <div className="container-fluid py-7.5">
      {/* ── Back nav ────────────────────────────────────────── */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to RFQs
        </button>
      </div>

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-foreground">{rfq.title}</h1>
            <Badge variant="success" appearance="light" size="sm">
              Open
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground font-mono">RFQ #{rfq.rfqNumber}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="size-3.5" />
            Edit RFQ
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="gap-2">
                <Lock className="size-3.5" />
                Mark RFQ as Closed
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="size-3.5" />
                Delete RFQ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Summary stats bar ───────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Track" value={rfq.tradeCategory} />
        <StatCard label="Vendors Invited" value={rfq.vendorsInvited} />
        <StatCard
          label="Quotes Received"
          value={rfq.quotesReceived}
          valueClassName="text-success"
        />
        <StatCard
          label="Lowest Quote"
          value={formatCurrency(rfq.lowestQuote)}
          valueClassName="text-success"
        />
      </div>

      {/* ── Quick actions bar ───────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-[var(--color-success-accent,theme(colors.green.600))] hover:bg-[var(--color-success-accent,theme(colors.green.600))]/90 text-white border-transparent"
            onClick={() => setCompareOpen(true)}
          >
            <BarChart2 className="size-3.5" />
            Compare {rfq.quotesReceived} Quotes
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Mail className="size-3.5" />
            Email All Vendors
          </Button>
        </div>
      </div>

      {/* ── Two-column layout ───────────────────────────────── */}
      <div className="flex gap-5 items-start">
        {/* Main column */}
        <div className="min-w-0 flex-1 flex flex-col gap-5">
          {/* Vendor Status Log */}
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Dark header */}
            <div className="flex items-center justify-between gap-3 bg-foreground/90 px-5 py-3">
              <div className="flex items-center gap-2">
                <Zap className="size-3.5 text-white/70" />
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  Vendor Status Log
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-white/20 bg-white/10 text-white text-xs hover:bg-white/20 hover:text-white gap-1.5"
              >
                <Plus className="size-3" />
                Add Vendor
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[220px]">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[110px]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[130px]">
                      Quote Amount
                    </th>
                    <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[110px]">
                      Lead Time
                    </th>
                    <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[120px]">
                      Quotation
                    </th>
                    <th className="w-8 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {MOCK_VENDORS.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="transition-colors hover:bg-muted/30 cursor-default"
                    >
                      {/* Vendor */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <VendorInitial name={vendor.name} />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-foreground">
                              {vendor.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{vendor.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={vendor.status} />
                      </td>

                      {/* Quote amount */}
                      <td className="px-4 py-3.5 text-right">
                        {vendor.quoteAmount != null ? (
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {formatCurrency(vendor.quoteAmount)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Lead time */}
                      <td className="px-4 py-3.5">
                        {vendor.leadTime ? (
                          <span className="text-sm text-foreground">{vendor.leadTime}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Quotation action */}
                      <td className="px-4 py-3.5">
                        {vendor.quoteAmount != null ? (
                          <Link
                            to={`vendors/${vendor.id}/quote`}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                          >
                            <FileText className="size-3 shrink-0" />
                            View Quote
                          </Link>
                        ) : vendor.status !== 'DECLINED' ? (
                          <button
                            type="button"
                            onClick={() => setUploadQuoteVendor(vendor)}
                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Upload className="size-3 shrink-0" />
                            Upload
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Three-dot */}
                      <td className="px-2 py-3.5">
                        <ThreeDotMenu
                          onUpdateQuote={
                            vendor.status === 'WAITING' || vendor.status === 'DECLINED'
                              ? () => setUploadQuoteVendor(vendor)
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attachments */}
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Paperclip className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  Attachments{' '}
                  <span className="text-muted-foreground">({MOCK_ATTACHMENTS.length})</span>
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-success transition-colors hover:text-success/80"
              >
                <Plus className="size-3.5" />
                Add File
              </button>
            </div>

            <div className="flex flex-col divide-y divide-border">
              {MOCK_ATTACHMENTS.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30 cursor-pointer"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-destructive/10">
                    <FileText className="size-4 text-destructive" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{file.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Information & Scope */}
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Dark header */}
            <div className="flex items-center gap-2 bg-foreground/90 px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-widest text-white">
                Project Information &amp; Scope
              </span>
            </div>

            <div className="bg-background px-6 py-6 flex flex-col gap-8">
              {/* Required Deliverables */}
              <div>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">
                  Required Deliverables
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="w-14 px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                          S/N
                        </th>
                        <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Product / Description
                        </th>
                        <th className="w-20 px-4 py-2.5 text-center text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Unit
                        </th>
                        <th className="w-16 px-4 py-2.5 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                          QTY
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {MOCK_DELIVERABLES.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-foreground">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tabular-nums">
                            {item.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Scope */}
              <div>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">
                  Detailed Scope
                </h3>
                <div className="flex flex-col gap-4">
                  <p className="text-[15px] leading-[1.7] text-foreground/80">
                    Fabrication and delivery of custom millwork casework for computer lab
                    renovation. This includes instructor stations, student workstations, and
                    integrated storage solutions across the primary teaching areas.
                  </p>
                  <p className="text-[15px] leading-[1.7] text-foreground/80">
                    The project requires strict adherence to architectural drawings A-301 through
                    A-305. All surfaces must meet AWI Premium Grade standards, specifically
                    regarding veneer matching and hardware installation. Coordination with
                    electrical contractors for integrated power grommets is essential.
                  </p>
                  <p className="text-[15px] leading-[1.7] text-foreground/80">
                    Material procurement should prioritize lead times for solid surface countertops
                    to ensure alignment with the overarching project schedule. Samples must be
                    submitted for approval prior to the commencement of fabrication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <DetailsSidebar rfq={rfq} />
      </div>

      {/* Bid comparison modal */}
      {compareOpen && <BidComparisonModal onClose={handleCloseCompare} />}

      {/* Upload quotation modal */}
      {uploadQuoteVendor && (
        <UploadQuotationModal vendor={uploadQuoteVendor} onClose={handleCloseUploadQuote} />
      )}
    </div>
  );
}
