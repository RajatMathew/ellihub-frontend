import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  useDownloadFile,
  useFilePreviewQuery,
  useTextContentQuery,
} from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Download, Eye, Loader2 } from 'lucide-react';

import { FileTypeIcon } from './file-type-icon';

type PreviewType = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'none';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
const TEXT_EXTENSIONS = [
  'txt',
  'md',
  'csv',
  'json',
  'xml',
  'html',
  'css',
  'js',
  'ts',
  'tsx',
  'jsx',
  'yml',
  'yaml',
  'log',
  'sql',
];

function getPreviewType(item: FileItem): PreviewType {
  const mime = item.mimeType ?? '';
  const extension = (item.displayName || item.name || '').split('.').pop()?.toLowerCase() ?? '';

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.includes(extension)) return 'video';
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.includes(extension)) return 'audio';
  if (mime.startsWith('text/') || TEXT_EXTENSIONS.includes(extension)) return 'text';

  return 'none';
}

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
  const { data: textContent } = useTextContentQuery(url, isFile && previewType === 'text' && !!url);
  const downloadFile = useDownloadFile();

  const handleDownload = () => {
    if (file) downloadFile.mutate(file);
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
                fileName={file.displayName || file.name}
                className="size-5 shrink-0"
              />
            )}
            <span className="truncate">{file?.displayName || file?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 overflow-auto">
          {isLoading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Eye className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Failed to load preview</p>
            </div>
          )}

          {!isLoading && !isError && url && previewType === 'image' && (
            <div className="flex h-full items-center justify-center p-4">
              <img
                src={url}
                alt={file?.displayName || file?.name || undefined}
                className="max-h-full max-w-full rounded-md object-contain"
              />
            </div>
          )}

          {!isLoading && !isError && url && previewType === 'pdf' && (
            <iframe
              src={url}
              title={file?.displayName || file?.name || undefined}
              className="h-full w-full rounded-md border"
            />
          )}

          {!isLoading && !isError && url && previewType === 'video' && (
            <div className="flex h-full items-center justify-center p-4">
              <video src={url} controls className="max-h-full max-w-full rounded-md">
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {!isLoading && !isError && url && previewType === 'audio' && (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <FileTypeIcon
                fileType="FILE"
                mimeType={file?.mimeType}
                fileName={file?.displayName || file?.name || ''}
                className="size-16"
              />
              <audio src={url} controls className="w-full max-w-md">
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {!isLoading && !isError && previewType === 'text' && textContent != null && (
            <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-4 font-mono text-xs">
              {textContent}
            </pre>
          )}

          {!isLoading && !isError && previewType === 'none' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <FileTypeIcon
                fileType="FILE"
                mimeType={file?.mimeType}
                fileName={file?.displayName || file?.name || ''}
                className="size-16 text-muted-foreground/40"
              />
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type
              </p>
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
