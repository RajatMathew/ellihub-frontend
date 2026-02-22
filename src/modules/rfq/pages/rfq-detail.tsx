import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ArrowLeft,
  BarChart2,
  Clock,
  CloudUpload,
  Download,
  ExternalLink,
  FileText,
  Flag,
  Lock,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
  X,
  XCircle,
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
import { cn } from '@app/lib/utils';

// ---------------------------------------------------------------------------
// Mock data types & constants
// ---------------------------------------------------------------------------

type VendorStatus = 'QUOTED' | 'WAITING' | 'DECLINED';

interface VendorRow {
  id: string;
  name: string;
  email: string;
  status: VendorStatus;
  quoteAmount: number | null;
  leadTime: string | null;
}

const MOCK_RFQ = {
  rfqNumber: '2025-001',
  title: 'Custom Millwork Package - Computer Lab Casework',
  status: 'PUBLISHED' as const,
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
// Sub-components
// ---------------------------------------------------------------------------

function VendorInitial({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('');
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </span>
  );
}

function StatusBadge({ status }: { status: VendorStatus }) {
  const map: Record<
    VendorStatus,
    {
      label: string;
      variant: 'success' | 'warning' | 'secondary';
      appearance: 'light' | 'outline';
    }
  > = {
    QUOTED: { label: 'Quoted', variant: 'success', appearance: 'light' },
    WAITING: { label: 'Waiting', variant: 'warning', appearance: 'light' },
    DECLINED: { label: 'Declined', variant: 'secondary', appearance: 'outline' },
  };
  const { label, variant, appearance } = map[status];
  return (
    <Badge variant={variant} appearance={appearance} size="sm">
      {label}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-background px-5 py-4 min-w-0">
      <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn('text-lg font-bold text-foreground', valueClassName)}>{value}</span>
    </div>
  );
}

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
          <XCircle className="size-3.5" />
          Mark as Declined
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Bid Comparison Modal — sub-components
// ---------------------------------------------------------------------------

/** Realistic quote/invoice document placeholder rendered inside a card */
function QuoteDocument({
  vendor,
  total,
  accentColor,
  companyColor,
}: {
  vendor: string;
  total: string;
  accentColor: string;
  companyColor: string;
}) {
  const lineItems = [
    { desc: 'Instructor Station — Type L1', unit: 'EA', qty: 2, unitPrice: 7840.0, ext: 15680.0 },
    { desc: 'Student Workstation — Type S4', unit: 'EA', qty: 12, unitPrice: 1875.0, ext: 22500.0 },
    { desc: 'Storage Cabinet — Type C2 (Tall)', unit: 'EA', qty: 6, unitPrice: 2340.0, ext: 14040.0 },
    { desc: 'Solid Surface Countertop — Black Pearl', unit: 'LF', qty: 112, unitPrice: 52.0, ext: 5824.0 },
    { desc: 'Hardware Kit — Premium Grade', unit: 'SET', qty: 40, unitPrice: 24.5, ext: 980.0 },
  ];
  const subtotal = lineItems.reduce((s, r) => s + r.ext, 0);
  const delivery = parseFloat(total.replace(/[^0-9.]/g, '')) - subtotal;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

  const shortVendor = vendor.split(' ').slice(0, 2).join(' ');

  return (
    <div className="rounded-lg bg-white shadow-sm text-[11px] overflow-hidden border border-gray-100">
      {/* Company header */}
      <div className="px-5 pt-5 pb-4" style={{ borderTop: `4px solid ${accentColor}` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            {/* Logo placeholder */}
            <div
              className="mb-2 flex size-10 items-center justify-center rounded-md text-white text-sm font-black"
              style={{ background: companyColor }}
            >
              {vendor.charAt(0)}
            </div>
            <div className="font-bold uppercase tracking-wide text-[13px] text-gray-900">
              {vendor}
            </div>
            <div className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
              411 Industrial Blvd, Suite 200<br />
              Brooklyn, NY 11237<br />
              Tel: (718) 555-0194
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[15px] font-black uppercase tracking-widest mb-1"
              style={{ color: accentColor }}
            >
              Quotation
            </div>
            <div className="text-[10px] text-gray-500 leading-loose">
              <span className="font-semibold text-gray-700">Quote #:</span> QT-{Math.floor(Math.random() * 9000) + 1000}<br />
              <span className="font-semibold text-gray-700">RFQ #:</span> 2025-101<br />
              <span className="font-semibold text-gray-700">Date:</span> Jan 16, 2022<br />
              <span className="font-semibold text-gray-700">Valid Until:</span> Feb 16, 2022
            </div>
          </div>
        </div>
      </div>

      {/* Bill To / Ship To */}
      <div className="grid grid-cols-2 gap-3 mx-5 mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Bill To</div>
          <div className="font-semibold text-gray-800">P.S. 397B School Project</div>
          <div className="text-gray-500 leading-relaxed">
            c/o John Martinez, Asst. PM<br />
            30 Court St, Brooklyn NY 11201<br />
            jmartinez@sca.nyc.gov
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ship To</div>
          <div className="font-semibold text-gray-800">P.S. 397B — Job Site</div>
          <div className="text-gray-500 leading-relaxed">
            1060 Myrtle Ave<br />
            Brooklyn, NY 11206<br />
            Contact: Site Superintendent
          </div>
        </div>
      </div>

      {/* Line items table */}
      <div className="mx-5 mb-4 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full">
          <thead>
            <tr style={{ background: accentColor }}>
              <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-white">
                Description
              </th>
              <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-white w-10">
                Unit
              </th>
              <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-white w-8">
                Qty
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-white w-20">
                Unit Price
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-white w-20">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 last:border-0"
                style={{ background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}
              >
                <td className="px-3 py-2 text-gray-700">{item.desc}</td>
                <td className="px-2 py-2 text-center text-gray-500">{item.unit}</td>
                <td className="px-2 py-2 text-center text-gray-700 font-medium">{item.qty}</td>
                <td className="px-2 py-2 text-right text-gray-700 tabular-nums">{fmt(item.unitPrice)}</td>
                <td className="px-2 py-2 text-right font-semibold text-gray-900 tabular-nums">{fmt(item.ext)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mx-5 mb-5">
        <div className="ml-auto w-56">
          <div className="flex justify-between py-1 text-gray-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1 text-gray-600">
            <span>Delivery &amp; Handling</span>
            <span className="tabular-nums">{fmt(delivery > 0 ? delivery : 857.25)}</span>
          </div>
          <div className="flex justify-between py-1 text-gray-600">
            <span>Tax (0%)</span>
            <span className="tabular-nums">$0.00</span>
          </div>
          <div
            className="mt-1 flex justify-between rounded-md px-2 py-2 font-black text-white text-[12px]"
            style={{ background: accentColor }}
          >
            <span>GRAND TOTAL</span>
            <span className="tabular-nums">{total}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="mx-5 mb-5 rounded-md bg-gray-50 border border-gray-100 p-3">
        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
          Terms &amp; Conditions
        </div>
        <div className="text-[10px] text-gray-500 leading-relaxed">
          Payment Terms: Net 30 days from invoice date. All materials meeting AWI Premium Grade
          specifications. Lead time begins upon receipt of signed contract and approved submittals.
          Pricing valid for 30 days. {shortVendor} carries full general liability insurance.
        </div>
      </div>

      {/* Signature block */}
      <div className="mx-5 mb-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Authorized Signature
          </div>
          <div className="border-b border-gray-300 w-full mb-1" />
          <div className="text-[9px] text-gray-400">Signature &amp; Date</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Print Name &amp; Title
          </div>
          <div className="border-b border-gray-300 w-full mb-1" />
          <div className="text-[9px] text-gray-400">Name &amp; Title</div>
        </div>
      </div>
    </div>
  );
}

/** Card for a vendor who submitted a bid */
function SubmittedBidCard({
  vendor,
  total,
  lead,
  accentColor,
  companyColor,
}: {
  vendor: string;
  total: string;
  lead: string;
  accentColor: string;
  companyColor: string;
}) {
  return (
    <div
      className="bid-card flex flex-col rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0"
      style={{ flex: '1 1 0', borderTop: `3px solid ${accentColor}` }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 bg-gray-800 px-2 py-1.5 shrink-0">
        {([Flag, Download, Printer, MoreHorizontal] as const).map((Icon, i) => (
          <button
            key={i}
            type="button"
            className="inline-flex size-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>

      {/* Document preview — independently scrollable */}
      <div className="rfq-doc-scroll flex-1 overflow-y-auto bg-gray-100 p-3 min-h-0">
        <QuoteDocument
          vendor={vendor}
          total={total}
          accentColor={accentColor}
          companyColor={companyColor}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-3 py-2.5 shrink-0">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[12px] font-bold text-gray-900 truncate">{vendor}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            Total: {total}&nbsp; · &nbsp;Lead: {lead}
          </span>
        </div>
        <button
          type="button"
          onClick={() => console.log('Award bid:', vendor)}
          className="shrink-0 rounded-lg bg-green-500 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-green-600"
        >
          Award Bid
        </button>
      </div>
    </div>
  );
}

/** Card for a vendor who has not submitted */
function NotSubmittedCard({ vendor }: { vendor: string }) {
  return (
    <div
      className="bid-card flex flex-col rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0"
      style={{ flex: '1 1 0', borderTop: '3px solid #d1d5db' }}
    >
      {/* Empty content area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gray-50 p-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-gray-200">
          <Clock className="size-7 text-gray-400" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Not Submitted
        </span>
        <span className="text-[10px] text-center text-gray-400 leading-relaxed max-w-[160px]">
          This vendor has not yet submitted a quote for this RFQ.
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-3 py-2.5 shrink-0">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[12px] font-bold text-gray-900 truncate">{vendor}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">(Not Submitted)</span>
        </div>
        <button
          type="button"
          disabled
          className="shrink-0 cursor-not-allowed rounded-lg bg-gray-200 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400"
        >
          Award Bid
        </button>
      </div>
    </div>
  );
}

/** Card for a vendor who declined */
function DeclinedCard({ vendor }: { vendor: string }) {
  return (
    <div
      className="bid-card flex flex-col rounded-xl border border-red-100 shadow-sm overflow-hidden min-w-0"
      style={{ flex: '1 1 0', borderTop: '3px solid #ef4444' }}
    >
      {/* Empty content area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-red-50 p-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="size-7 text-red-400" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-red-400">
          Declined Bid
        </span>
        <span className="text-[10px] text-center text-red-400/80 leading-relaxed max-w-[160px]">
          This vendor has declined to participate in this RFQ.
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-3 py-2.5 shrink-0">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[12px] font-bold text-gray-900 truncate">{vendor}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">(Not Submitted)</span>
        </div>
        <button
          type="button"
          disabled
          className="shrink-0 cursor-not-allowed rounded-lg bg-gray-200 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400"
        >
          Declined
        </button>
      </div>
    </div>
  );
}

/** Full-screen bid comparison modal */
function BidComparisonModal({ onClose }: { onClose: () => void }) {
  // Body scroll lock + Escape key handler
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <>
      {/* Injected keyframe animations */}
      <style>{`
        @keyframes rfqFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rfqSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0)    scale(1);     }
        }
        .rfq-overlay { animation: rfqFadeIn  0.22s ease forwards; }
        .rfq-modal   { animation: rfqSlideUp 0.30s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .rfq-doc-scroll::-webkit-scrollbar       { width: 4px; }
        .rfq-doc-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .rfq-doc-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .bid-card { transition: box-shadow 0.2s ease; }
        .bid-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.10); }
      `}</style>

      {/* Backdrop */}
      <div
        className="rfq-overlay fixed inset-0 z-50 flex items-center justify-center p-3"
        style={{ background: 'rgba(0,0,0,0.72)' }}
        onClick={onClose}
      >
        {/* Modal panel */}
        <div
          className="rfq-modal relative flex flex-col rounded-2xl bg-white overflow-hidden"
          style={{ width: '95vw', height: '90vh', maxWidth: '1700px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Sticky header ─── */}
          <div className="sticky top-0 z-10 flex shrink-0 items-center gap-6 border-b border-gray-200 bg-white/95 px-6 py-3.5 backdrop-blur-sm">
            {/* Left — title */}
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">
                Bid Comparison
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Comparing 4 Vendors for RFQ #2025-101
              </span>
            </div>

            {/* Center — issue / due date */}
            <div className="mx-auto flex items-center gap-6">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                  Issue Date
                </span>
                <span className="text-[13px] font-black text-gray-900">16 Jan, 2022</span>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                  Due Date
                </span>
                <span className="text-[13px] font-black text-gray-900">16 Jan, 2024</span>
              </div>
            </div>

            {/* Right — actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => console.log('Download all bids')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <Download className="size-3.5" />
                Download All
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* ─── Card grid ─── */}
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
            <SubmittedBidCard
              vendor="Millwood LLC"
              total="$59,881.25"
              lead="6-8 Weeks ARO"
              accentColor="#d97706"
              companyColor="#92400e"
            />
            <SubmittedBidCard
              vendor="Brooklyn Woodcraft"
              total="$63,400.00"
              lead="8-10 Weeks ARO"
              accentColor="#0891b2"
              companyColor="#164e63"
            />
            <NotSubmittedCard vendor="Metro Cabinet Works" />
            <DeclinedCard vendor="Queens Millwork Inc" />
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Upload Quotation Modal
// ---------------------------------------------------------------------------

function UploadQuotationModal({
  vendor,
  onClose,
}: {
  vendor: VendorRow;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('0.00');
  const [leadTime, setLeadTime] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<{ amount?: boolean; file?: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Body scroll lock + Escape key
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  function handleFileChange(f: File | null) {
    if (!f) return;
    setFile(f);
    setErrors((prev) => ({ ...prev, file: false }));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0] ?? null;
    handleFileChange(dropped);
  }

  function handleSubmit() {
    const newErrors: { amount?: boolean; file?: boolean } = {};
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) newErrors.amount = true;
    if (!file) newErrors.file = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    console.log('Upload quotation:', {
      vendorId: vendor.id,
      vendorName: vendor.name,
      amount: parsedAmount,
      leadTime,
      fileName: file?.name,
    });
    onClose();
  }

  return (
    <>
      <style>{`
        @keyframes uqFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes uqSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .uq-overlay { animation: uqFadeIn  0.20s ease forwards; }
        .uq-modal   { animation: uqSlideUp 0.26s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      `}</style>

      {/* Backdrop */}
      <div
        className="uq-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.72)' }}
        onClick={onClose}
      >
        {/* Modal panel */}
        <div
          className="uq-modal relative flex flex-col rounded-[8px] bg-white shadow-2xl"
          style={{ width: '100%', maxWidth: '465px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-100">
                <FileText className="size-4 text-red-500" />
              </div>
              <span className="text-[13px] font-black uppercase tracking-widest text-gray-900">
                Upload Quotation
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Vendor name pill */}
          <div className="flex items-center gap-2 bg-gray-50 px-6 py-2.5 border-b border-gray-100">
            <VendorInitial name={vendor.name} />
            <div className="flex flex-col gap-px">
              <span className="text-[12px] font-semibold text-gray-900">{vendor.name}</span>
              <span className="text-[11px] text-gray-500">{vendor.email}</span>
            </div>
          </div>

          {/* ── Form body ── */}
          <div className="flex flex-col gap-5 px-6 py-6">
            {/* Quotation Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Quotation Amount
              </label>
              <div
                className={cn(
                  'flex items-center overflow-hidden rounded-[6px] border bg-white transition-shadow focus-within:ring-2 focus-within:ring-green-400/40',
                  errors.amount ? 'border-red-400' : 'border-gray-300',
                )}
                style={{ height: '44px' }}
              >
                <span className="flex h-full items-center border-r border-gray-200 bg-gray-50 px-3 text-[14px] font-semibold text-gray-500 shrink-0">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrors((prev) => ({ ...prev, amount: false }));
                  }}
                  className="h-full w-full bg-transparent px-3 text-[14px] font-semibold text-gray-900 outline-none placeholder:text-gray-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              {errors.amount && (
                <span className="text-[11px] text-red-500">Please enter a valid amount.</span>
              )}
            </div>

            {/* Lead Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Lead Time
              </label>
              <input
                type="text"
                placeholder="e.g. 6-8 weeks, 45 days"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="rounded-[6px] border border-gray-300 bg-white px-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition-shadow focus:ring-2 focus:ring-green-400/40"
                style={{ height: '44px' }}
              />
            </div>

            {/* Quote Document */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Quote Document
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.docx"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              {file ? (
                /* File selected — show file chip */
                <div
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-[6px] border px-4 py-3',
                    errors.file ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="size-4 shrink-0 text-red-500" />
                    <span className="truncate text-[13px] font-medium text-gray-800">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="shrink-0 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                /* Dropzone */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[6px] border-2 border-dashed px-5 transition-colors',
                    isDragOver
                      ? 'border-green-400 bg-green-50'
                      : errors.file
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100',
                  )}
                  style={{ height: '160px' }}
                >
                  <CloudUpload
                    className={cn(
                      'size-8',
                      isDragOver ? 'text-green-500' : errors.file ? 'text-red-400' : 'text-gray-400',
                    )}
                  />
                  <span className="text-[13px] font-medium text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    PDF, XLSX or DOCX (Max. 20MB)
                  </span>
                </div>
              )}
              {errors.file && !file && (
                <span className="text-[11px] text-red-500">Please attach a quote document.</span>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] border border-gray-300 bg-transparent px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-[6px] bg-green-500 px-5 py-2 text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-green-600"
            >
              Submit Quote
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function DetailsSidebar() {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const rfq = MOCK_RFQ;

  return (
    <aside className="w-[300px] shrink-0 rounded-xl border border-border bg-background overflow-hidden flex flex-col">
      {/* Tab header */}
      <div className="flex items-center border-b border-border">
        {(['details', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'relative flex items-center gap-1.5 px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'details' ? 'Details' : 'Activity'}
            {tab === 'activity' && (
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-white">
                3
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'details' ? (
        <div className="flex flex-col gap-6 p-5 overflow-y-auto flex-1">
          {/* Project */}
          <div className="flex flex-col gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project
            </span>
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{rfq.projectName}</span>
                <span className="text-xs text-muted-foreground">{rfq.projectId}</span>
              </div>
              <ExternalLink className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            </div>
          </div>

          {/* Key dates */}
          <div className="flex flex-col gap-3">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Key Dates
            </span>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Issue Date</span>
                <span className="text-xs font-medium text-foreground">
                  {formatDate(rfq.issueDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Response Due</span>
                <span className="text-xs font-medium text-foreground">
                  {formatDate(rfq.responseDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Created by */}
          <div className="flex flex-col gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              RFQ Created By
            </span>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {rfq.createdBy.initials}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {rfq.createdBy.name}
                </span>
                <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {rfq.createdBy.role}
                </span>
              </div>
            </div>
          </div>

          {/* Project notice */}
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs leading-relaxed text-foreground">{rfq.notice}</p>
              <Pencil className="size-3.5 mt-0.5 shrink-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Comment input */}
          <div className="p-4 border-b border-border shrink-0">
            <input
              type="text"
              placeholder="Leave a comment..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Timeline feed */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="relative flex flex-col gap-5">
              {/* Vertical connecting line */}
              <div className="absolute left-[17px] top-9 bottom-9 w-px bg-border" />

              {/* 1 — Closed the RFQ */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-foreground shadow-sm">
                  <Lock className="size-3.5 text-white" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">John Martinez</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 17, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Closed the RFQ</span>
                </div>
              </div>

              {/* 2 — Uploaded Quote · Millwood LLC */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Upload className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">John Martinez</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 16, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Uploaded Quote{' '}
                    <span className="text-foreground/70 font-medium">· Millwood LLC</span>
                  </span>
                </div>
              </div>

              {/* 3 — Uploaded Quote · Brooklyn Woodcraft */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Upload className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">John Martinez</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 15, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Uploaded Quote{' '}
                    <span className="text-foreground/70 font-medium">· Brooklyn Woodcraft</span>
                  </span>
                </div>
              </div>

              {/* 4 — Commented */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">John Martinez</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 12, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Commented</span>
                  {/* Blockquote card */}
                  <div className="mt-1 rounded-md bg-muted/60 border border-border/60 px-3 py-2.5">
                    <p className="text-[12px] leading-relaxed text-foreground/80">
                      &ldquo;Met with Millwood today. They are confident in meeting the AWI Premium requirements.&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* 5 — Edited the RFQ */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Pencil className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">John Martinez</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 09, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Edited the RFQ</span>
                </div>
              </div>

              {/* 6 — Created the RFQ */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Plus className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">John Martinez</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 08, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Created the RFQ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RfqDetail() {
  const { projectId, rfqNumber: _rfqNumber } = useParams<{ projectId: string; rfqNumber: string }>();
  // _rfqNumber will be used to fetch real data from the API (mock data shown for now)
  const navigate = useNavigate();
  const rfq = MOCK_RFQ; // In real app: fetch by rfqNumber

  const backPath = projectId ? `/project/${projectId}/rfqs` : '/app/rfqs';

  const [compareOpen, setCompareOpen] = useState(false);
  const handleCloseCompare = useCallback(() => setCompareOpen(false), []);

  const [uploadQuoteVendor, setUploadQuoteVendor] = useState<VendorRow | null>(null);
  const handleCloseUploadQuote = useCallback(() => setUploadQuoteVendor(null), []);

  return (
    <div className="container-fluid py-7.5">
      {/* ── Breadcrumb / back nav ────────────────────────────────── */}
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

      {/* ── Page header ─────────────────────────────────────────── */}
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

      {/* ── Summary stats bar ───────────────────────────────────── */}
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

      {/* ── Quick actions bar ───────────────────────────────────── */}
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

      {/* ── Two-column layout ───────────────────────────────────── */}
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
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>

          {/* Project Information & Scope */}
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Dark header — matches Vendor Status Log */}
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
        <DetailsSidebar />
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
