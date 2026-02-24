import { Clock, Download, Flag, MoreHorizontal, Printer, XCircle } from 'lucide-react';

import { QuoteDocument } from './quote-document';

export function SubmittedBidCard({
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

export function NotSubmittedCard({ vendor }: { vendor: string }) {
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

export function DeclinedCard({ vendor }: { vendor: string }) {
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
