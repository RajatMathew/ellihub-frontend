import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { emailApi } from '@/modules/email/api';
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { Download, File, FileText, LoaderCircle } from 'lucide-react';

type EmailAttachmentViewerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  messageId: string;
  attachment: EmailAttachment | null;
};

export function EmailAttachmentViewerDialog({
  open,
  onOpenChange,
  accountId,
  messageId,
  attachment,
}: EmailAttachmentViewerDialogProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!open || !attachment) {
      setBlob(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setBlob(null);
    setError(null);
    setIsLoading(true);
    emailApi
      .getAttachment(accountId, messageId, attachment.id)
      .then((result) => {
        if (!cancelled) setBlob(result);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load this attachment. Try again or download it.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, attachment, messageId, open]);

  const objectUrl = useMemo(() => {
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [blob]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const fileName = attachment?.name || 'Attachment';
  const contentType = blob?.type || attachment?.mimeType || 'application/octet-stream';
  const isImage = contentType.startsWith('image/');
  const isPdf = contentType === 'application/pdf';
  const isText = contentType.startsWith('text/') || contentType === 'application/json';
  const isAudio = contentType.startsWith('audio/');
  const isVideo = contentType.startsWith('video/');

  const download = () => {
    if (!objectUrl) return;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(78vh,760px)] max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 flex gap-3 border-b px-5 py-4 pe-14 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              {isImage || isPdf ? (
                <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <File className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <DialogTitle className="truncate text-base">{fileName}</DialogTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!objectUrl}
            onClick={download}
          >
            <Download className="size-4" aria-hidden="true" />
            Download
          </Button>
        </DialogHeader>

        <DialogBody className="min-h-0 overflow-auto bg-muted/40 p-4">
          {isLoading && (
            <div className="flex h-full min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading attachment…
            </div>
          )}

          {!isLoading && error && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm font-medium text-foreground">Attachment preview unavailable</p>
              <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
              <Button type="button" variant="outline" onClick={download} disabled={!objectUrl}>
                <Download className="size-4" aria-hidden="true" />
                Download attachment
              </Button>
            </div>
          )}

          {!isLoading && !error && objectUrl && isImage && (
            <div className="flex min-h-full items-center justify-center">
              <img
                src={objectUrl}
                alt={fileName}
                className="max-h-[calc(100vh-10rem)] max-w-full object-contain"
              />
            </div>
          )}

          {!isLoading && !error && objectUrl && isPdf && (
            <iframe
              src={objectUrl}
              title={fileName}
              className="h-[calc(100vh-10rem)] w-full border-0 bg-background"
            />
          )}

          {!isLoading && !error && objectUrl && (isAudio || isVideo) && (
            <div className="flex min-h-full items-center justify-center">
              {isAudio ? (
                <audio controls src={objectUrl} className="w-full max-w-xl" />
              ) : (
                <video controls src={objectUrl} className="max-h-[calc(100vh-10rem)] max-w-full" />
              )}
            </div>
          )}

          {!isLoading && !error && objectUrl && isText && <TextPreview blob={blob} />}

          {!isLoading &&
            !error &&
            objectUrl &&
            !isImage &&
            !isPdf &&
            !isAudio &&
            !isVideo &&
            !isText && (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                <File className="size-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">
                  This file type cannot be previewed here.
                </p>
                <Button type="button" variant="outline" onClick={download}>
                  <Download className="size-4" aria-hidden="true" />
                  Download attachment
                </Button>
              </div>
            )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function TextPreview({ blob }: { blob: Blob | null }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    blob.text().then((value) => {
      if (!cancelled) setText(value);
    });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  return (
    <pre className="mx-auto max-w-4xl whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm text-foreground">
      {text}
    </pre>
  );
}
