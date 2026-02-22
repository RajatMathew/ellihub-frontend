import { useEffect } from 'react';

import { Download, X } from 'lucide-react';

import { DeclinedCard, NotSubmittedCard, SubmittedBidCard } from './bid-cards';

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
