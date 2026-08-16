import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { formatCurrency } from '@/app/lib/helpers';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { useDownloadFile } from '@/modules/files/hooks/files.hooks';
import { getRFQQuoteLeadTime } from '@/modules/project/lib/rfq-quote';
import type { RFQQuote, RFQQuoteAttachment } from '@/modules/project/schemas/rfq';
import { Download, FileText } from 'lucide-react';

interface RFQQuoteViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: RFQQuote | null | undefined;
  rfqLabel?: string | null;
}

function getAttachmentFile(attachment: RFQQuoteAttachment): FilePreviewItem | null {
  if (attachment.document) {
    return {
      id: attachment.document.id,
      name: attachment.document.name,
      mimeType: attachment.document.mimeType,
    };
  }

  if (!attachment.documentId) return null;

  return {
    id: attachment.documentId,
    name: attachment.name ?? 'Document',
  };
}

function QuoteValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function RFQQuoteViewDialog({
  open,
  onOpenChange,
  quote,
  rfqLabel,
}: RFQQuoteViewDialogProps) {
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);
  const downloadFile = useDownloadFile();

  if (!quote) return null;

  const amount = quote.grandTotal ?? quote.totalAmount;
  const leadTime = getRFQQuoteLeadTime(quote);
  const formattedLeadTime =
    leadTime && /^\d+$/.test(leadTime)
      ? `${leadTime} ${leadTime === '1' ? 'day' : 'days'}`
      : leadTime;
  const vendorName = quote.vendor?.name?.trim();
  const context = [rfqLabel, vendorName].filter(Boolean).join(' · ');
  const attachments = quote.attachments ?? [];

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPreviewFile(null);
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 pr-6">
              <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <DialogTitle>View Quotation</DialogTitle>
            </div>
            <DialogDescription>
              {context || 'Review the quotation submitted for this RFQ.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuoteValue
              label="Quotation Amount"
              value={amount != null ? formatCurrency(amount) : 'Not provided'}
            />
            <QuoteValue
              label="Negotiation Amount"
              value={
                quote.negotiationAmount != null
                  ? formatCurrency(quote.negotiationAmount)
                  : 'Not provided'
              }
            />
            <div className="sm:col-span-2">
              <QuoteValue label="Lead Time" value={formattedLeadTime ?? 'Not provided'} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
              Quote Documents
            </p>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => {
                  const file = getAttachmentFile(attachment);
                  const name = file?.name ?? attachment.name ?? 'Document';

                  return (
                    <div
                      key={attachment.id}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        {file ? (
                          <button
                            type="button"
                            className="truncate text-left text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setPreviewFile(file)}
                          >
                            {name}
                          </button>
                        ) : (
                          <span className="truncate text-sm text-foreground">{name}</span>
                        )}
                      </div>
                      {file ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          mode="icon"
                          className="size-7 shrink-0"
                          aria-label={`Download ${name}`}
                          disabled={downloadFile.isPending}
                          onClick={() => downloadFile.mutate(file)}
                        >
                          <Download className="size-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                No quote documents were attached.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPreviewFile(null);
        }}
        file={previewFile}
      />
    </>
  );
}
