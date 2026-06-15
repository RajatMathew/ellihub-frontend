import { useEffect, useMemo } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { downloadGeneratedPdf, type GeneratedPdfFile } from '@/app/lib/generated-pdf';
import { cn } from '@/app/lib/utils';
import { Download, FileText } from 'lucide-react';

type PdfPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: GeneratedPdfFile | null;
  title?: string;
  className?: string;
};

export function PdfPreviewDialog({
  open,
  onOpenChange,
  file,
  title,
  className,
}: PdfPreviewDialogProps) {
  const titleText = title || file?.fileName || 'PDF Preview';
  const objectUrl = useMemo(() => {
    if (!open || !file) return null;
    return window.URL.createObjectURL(file.blob);
  }, [file, open]);

  useEffect(() => {
    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen" className={cn('gap-0 overflow-hidden p-0', className)}>
        <DialogHeader className="mb-0 flex gap-3 border-b px-5 py-4 pe-14 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <FileText className="size-4 text-muted-foreground" />
            </div>
            <DialogTitle className="truncate text-base">{titleText}</DialogTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!file}
            onClick={() => {
              if (file) downloadGeneratedPdf(file);
            }}
          >
            <Download className="size-4" />
            Download
          </Button>
        </DialogHeader>

        <DialogBody className="min-h-0 bg-muted/40 p-3">
          {objectUrl ? (
            <iframe
              src={objectUrl}
              title={titleText}
              className="h-full w-full border-0 bg-background"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              PDF preview unavailable.
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
