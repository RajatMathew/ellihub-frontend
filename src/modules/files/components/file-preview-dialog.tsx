import { Download, Eye, Loader2 } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';

import type { FileItem } from '@modules/files/schemas/file.schema';

import { useFilePreviewQuery, useTextContentQuery } from '../hooks/files.hooks';
import { FileTypeIcon } from './file-type-icon';

// ── Preview support detection ────────────────────────────────────────

type PreviewType = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'none';

function getPreviewType(item: FileItem): PreviewType {
  const mime = item.mimeType ?? '';
  const ext = item.name.split('.').pop()?.toLowerCase() ?? '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext))
    return 'image';
  if (mime === 'application/pdf' || ext === 'pdf')
    return 'pdf';
  if (mime.startsWith('video/') || ['mp4', 'webm', 'ogg'].includes(ext))
    return 'video';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext))
    return 'audio';
  if (
    mime.startsWith('text/') ||
    ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'yml', 'yaml', 'log', 'sql'].includes(ext)
  )
    return 'text';

  return 'none';
}

// ── Component ────────────────────────────────────────────────────────

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
}

export function FilePreviewDialog({ open, onOpenChange, file }: FilePreviewDialogProps) {
  const isFile = open && !!file && file.type !== 'FOLDER';
  const previewType = file ? getPreviewType(file) : 'none';

  const {
    data: url,
    isLoading,
    isError,
  } = useFilePreviewQuery(isFile ? file?.id : undefined, isFile);

  const { data: textContent } = useTextContentQuery(
    url,
    isFile && previewType === 'text' && !!url,
  );

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            {file && (
              <FileTypeIcon
                fileType={file.type}
                mimeType={file.mimeType}
                fileName={file.name}
                className="size-5 shrink-0"
              />
            )}
            <span className="truncate">{file?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="flex-1 min-h-0 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center gap-3 h-full">
              <Eye className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Failed to load preview</p>
            </div>
          )}

          {!isLoading && !isError && url && previewType === 'image' && (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={url}
                alt={file?.name}
                className="max-w-full max-h-full object-contain rounded-md"
              />
            </div>
          )}

          {!isLoading && !isError && url && previewType === 'pdf' && (
            <iframe
              src={url}
              title={file?.name}
              className="w-full h-full rounded-md border"
            />
          )}

          {!isLoading && !isError && url && previewType === 'video' && (
            <div className="flex items-center justify-center h-full p-4">
              <video
                src={url}
                controls
                className="max-w-full max-h-full rounded-md"
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {!isLoading && !isError && url && previewType === 'audio' && (
            <div className="flex flex-col items-center justify-center gap-6 h-full">
              <FileTypeIcon
                fileType="FILE"
                mimeType={file?.mimeType}
                fileName={file?.name ?? ''}
                className="size-16"
              />
              <audio src={url} controls className="w-full max-w-md">
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {!isLoading && !isError && previewType === 'text' && textContent != null && (
            <pre className="w-full h-full overflow-auto rounded-md border bg-muted/30 p-4 text-xs font-mono whitespace-pre-wrap break-words">
              {textContent}
            </pre>
          )}

          {!isLoading && !isError && previewType === 'none' && (
            <div className="flex flex-col items-center justify-center gap-3 h-full">
              <FileTypeIcon
                fileType="FILE"
                mimeType={file?.mimeType}
                fileName={file?.name ?? ''}
                className="size-16 text-muted-foreground/40"
              />
              <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!url}>
                <Download className="size-3.5" />
                Download to view
              </Button>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={!url}>
            <Download className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
