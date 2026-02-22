// ---------------------------------------------------------------------------
// Bid Comparison Modal — all related sub-components
// ---------------------------------------------------------------------------

import { useEffect } from 'react';

import { Clock, Download, Flag, MoreHorizontal, Printer, X, XCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// QuoteDocument
// ---------------------------------------------------------------------------

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
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(n);

  const shortVendor = vendor.split(' ').slice(0, 2).join(' ');

  return (
    <div className="rounded-lg bg-white shadow-sm text-[11px] overflow-hidden border border-gray-100">
      {/* Company header */}
      <div className="px-5 pt-5 pb-4" style={{ borderTop: `4px solid ${accentColor}` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
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

// ---------------------------------------------------------------------------
// SubmittedBidCard
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// NotSubmittedCard
// ---------------------------------------------------------------------------

function NotSubmittedCard({ vendor }: { vendor: string }) {
  return (
    <div
      className="bid-card flex flex-col rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0"
      style={{ flex: '1 1 0', borderTop: '3px solid #d1d5db' }}
    >
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

// ---------------------------------------------------------------------------
// DeclinedCard
// ---------------------------------------------------------------------------

function DeclinedCard({ vendor }: { vendor: string }) {
  return (
    <div
      className="bid-card flex flex-col rounded-xl border border-red-100 shadow-sm overflow-hidden min-w-0"
      style={{ flex: '1 1 0', borderTop: '3px solid #ef4444' }}
    >
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

// ---------------------------------------------------------------------------
// BidComparisonModal
// ---------------------------------------------------------------------------

export function BidComparisonModal({ onClose }: { onClose: () => void }) {
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
          {/* Sticky header */}
          <div className="sticky top-0 z-10 flex shrink-0 items-center gap-6 border-b border-gray-200 bg-white/95 px-6 py-3.5 backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">
                Bid Comparison
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Comparing 4 Vendors for RFQ #2025-101
              </span>
            </div>

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

          {/* Card grid */}
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
