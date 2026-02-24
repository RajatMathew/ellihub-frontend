import { useEffect, useRef, useState } from 'react';

import { CloudUpload, FileText, X } from 'lucide-react';

import { cn } from '@app/lib/utils';

import type { VendorRow } from '@modules/rfq/types';

import { VendorInitial } from './vendor-initial';

export function UploadQuotationModal({
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
          {/* Header */}
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

          {/* Form body */}
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

          {/* Footer */}
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
