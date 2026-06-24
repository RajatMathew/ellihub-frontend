import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { FILE_TEXT_PREVIEW_BYTES, filesApi } from '@/modules/files/api/files.api';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import { useDownloadFile, useTextContentQuery } from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Download, ExternalLink, Eye, Loader2 } from 'lucide-react';

import { FileTypeIcon } from './file-type-icon';

export type FilePreviewItem = Pick<FileItem, 'id'> & Partial<FileItem>;

type PreviewType =
  | 'image'
  | 'pdf'
  | 'video'
  | 'audio'
  | 'spreadsheet'
  | 'text'
  | 'document'
  | 'archive'
  | 'generic';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
const DELIMITED_SPREADSHEET_EXTENSIONS = ['csv', 'tsv'];
const SPREADSHEET_EXTENSIONS = ['csv', 'tsv', 'xls', 'xlsx', 'ods'];
const DOCUMENT_EXTENSIONS = ['doc', 'docx', 'odt', 'rtf', 'ppt', 'pptx', 'odp'];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
const TEXT_EXTENSIONS = [
  'txt',
  'md',
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
const LARGE_PREVIEW_BYTES = 10 * 1024 * 1024;

function getExtension(item: FilePreviewItem | null): string {
  return (item?.displayName || item?.name || '').split('.').pop()?.toLowerCase() ?? '';
}

function getPreviewType(item: FilePreviewItem): PreviewType {
  const mime = item.mimeType ?? '';
  const extension = getExtension(item);

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.includes(extension)) return 'video';
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.includes(extension)) return 'audio';
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'text/csv' ||
    SPREADSHEET_EXTENSIONS.includes(extension)
  ) {
    return 'spreadsheet';
  }
  if (mime.startsWith('text/') || TEXT_EXTENSIONS.includes(extension)) return 'text';
  if (
    mime.includes('wordprocessing') ||
    mime.includes('msword') ||
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    DOCUMENT_EXTENSIONS.includes(extension)
  ) {
    return 'document';
  }
  if (
    mime.includes('zip') ||
    mime.includes('compressed') ||
    ARCHIVE_EXTENSIONS.includes(extension)
  ) {
    return 'archive';
  }

  return 'generic';
}

function getPreviewTypeLabel(previewType: PreviewType): string {
  switch (previewType) {
    case 'image':
      return 'Image';
    case 'pdf':
      return 'PDF';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'spreadsheet':
      return 'Spreadsheet';
    case 'text':
      return 'Text';
    case 'document':
      return 'Document';
    case 'archive':
      return 'Archive';
    case 'generic':
      return 'File';
  }
}

function isDelimitedSpreadsheet(item: FilePreviewItem | null): boolean {
  const mime = item?.mimeType ?? '';
  const extension = getExtension(item);

  return mime === 'text/csv' || DELIMITED_SPREADSHEET_EXTENSIONS.includes(extension);
}

function hasEmbeddedLoadState(previewType: PreviewType): boolean {
  return (
    previewType === 'image' ||
    previewType === 'pdf' ||
    previewType === 'video' ||
    previewType === 'audio'
  );
}

function isLargeEmbeddedPreview(item: FilePreviewItem | null, previewType: PreviewType): boolean {
  return hasEmbeddedLoadState(previewType) && (item?.size ?? 0) > LARGE_PREVIEW_BYTES;
}

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function FileLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md border bg-background">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading preview...</p>
    </div>
  );
}

function PreviewMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Eye className="size-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function getDelimiter(item: FilePreviewItem | null): string {
  return getExtension(item) === 'tsv' ? '\t' : ',';
}

function parseDelimitedRows(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (rows.length >= 200) break;
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.map((cells) => cells.slice(0, 50));
}

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FilePreviewItem | null;
}

function PreviewActions({
  file,
  url,
  onPreview,
  showPreviewAction,
}: {
  file: FilePreviewItem | null;
  url?: string;
  onPreview?: () => void;
  showPreviewAction?: boolean;
}) {
  const downloadFile = useDownloadFile();

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {url && (
        <Button variant="outline" size="sm" onClick={() => openUrl(url)}>
          <ExternalLink className="size-3.5" />
          Open
        </Button>
      )}
      {showPreviewAction && onPreview && (
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="size-3.5" />
          Preview anyway
        </Button>
      )}
      <Button size="sm" onClick={() => file && downloadFile.mutate(file)} disabled={!file}>
        <Download className="size-3.5" />
        Download
      </Button>
    </div>
  );
}

function FallbackPreview({
  file,
  url,
  type,
}: {
  file: FilePreviewItem | null;
  url?: string;
  type: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <FileTypeIcon
        fileType="FILE"
        mimeType={file?.mimeType}
        fileName={file?.displayName || file?.name || ''}
        className="size-16 text-muted-foreground/50"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Preview not available</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {type} files can still be opened or downloaded from this window.
        </p>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 sm:text-left">
        <span>Type</span>
        <span className="min-w-0 break-all font-medium text-foreground">
          {file?.mimeType || type}
        </span>
        <span>Size</span>
        <span className="font-medium text-foreground">{formatFileSize(file?.size)}</span>
      </div>
      <PreviewActions file={file} url={url} />
    </div>
  );
}

function LargeFilePreview({
  file,
  url,
  type,
  onPreview,
}: {
  file: FilePreviewItem | null;
  url?: string;
  type: string;
  onPreview: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <FileTypeIcon
        fileType="FILE"
        mimeType={file?.mimeType}
        fileName={file?.displayName || file?.name || ''}
        className="size-16 text-muted-foreground/50"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Large preview paused</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {type} is {formatFileSize(file?.size)}. Open it in a new tab, download it, or preview it
          here when needed.
        </p>
      </div>
      <PreviewActions file={file} url={url} onPreview={onPreview} showPreviewAction />
    </div>
  );
}

function SpreadsheetPreview({ rows }: { rows: string[][] }) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No rows found in this spreadsheet.
      </div>
    );
  }

  const [headerRow, ...bodyRows] = rows;

  return (
    <div className="h-full overflow-auto rounded-md border bg-background">
      <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            {headerRow.map((cell, index) => (
              <th
                key={`${cell}-${index}`}
                className="max-w-64 border-b border-r px-3 py-2 font-medium text-foreground"
              >
                <span className="line-clamp-2 break-words">{cell || `Column ${index + 1}`}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-muted/20">
              {headerRow.map((_, cellIndex) => (
                <td key={cellIndex} className="max-w-64 border-b border-r px-3 py-2 align-top">
                  <span className="line-clamp-3 break-words">{row[cellIndex] ?? ''}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilePreviewDialog({ open, onOpenChange, file }: FilePreviewDialogProps) {
  const isFile = open && !!file && file.type !== 'FOLDER';
  const previewType = file ? getPreviewType(file) : 'generic';
  const previewTypeLabel = getPreviewTypeLabel(previewType);
  const canPreviewDelimited = isDelimitedSpreadsheet(file);
  const [loadedFilePreviewKey, setLoadedFilePreviewKey] = useState<string | null>(null);
  const [previewLargeFileId, setPreviewLargeFileId] = useState<string | null>(null);
  const url = isFile && file ? filesApi.getFileReadUrl(file.id) : undefined;
  const previewLargeFile = open && previewLargeFileId === file?.id;
  const shouldGateLargePreview = isLargeEmbeddedPreview(file, previewType) && !previewLargeFile;
  const {
    data: textContent,
    error: textContentError,
    isError: isTextContentError,
    isLoading: isTextContentLoading,
  } = useTextContentQuery(
    isFile ? file?.id : undefined,
    isFile && (previewType === 'text' || canPreviewDelimited)
  );
  const textPreviewErrorMessage = isTextContentError
    ? getApiErrorMessage(textContentError, 'Failed to load text preview.')
    : undefined;
  const spreadsheetRows = useMemo(
    () =>
      textContent && canPreviewDelimited ? parseDelimitedRows(textContent, getDelimiter(file)) : [],
    [canPreviewDelimited, file, textContent]
  );
  const downloadFile = useDownloadFile();
  const embeddedPreviewKey =
    open && hasEmbeddedLoadState(previewType) && url && !shouldGateLargePreview
      ? `${file?.id}:${previewType}:${url}`
      : null;
  const isEmbeddedFileLoading = !!embeddedPreviewKey && loadedFilePreviewKey !== embeddedPreviewKey;
  const textPreviewNotice =
    textContent && textContent.length >= FILE_TEXT_PREVIEW_BYTES
      ? `Showing the first ${formatFileSize(FILE_TEXT_PREVIEW_BYTES)}.`
      : null;
  const handleDownload = () => {
    if (file) downloadFile.mutate(file);
  };

  const markEmbeddedPreviewLoaded = () => {
    setLoadedFilePreviewKey(embeddedPreviewKey);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen">
        <DialogHeader>
          <DialogTitle className="flex min-w-0 max-w-full items-center gap-2.5 pr-6">
            {file && (
              <FileTypeIcon
                fileType={file.type ?? 'FILE'}
                mimeType={file.mimeType}
                fileName={file.displayName || file.name}
                className="size-5 shrink-0"
              />
            )}
            <span
              className="min-w-0 flex-1 truncate"
              title={file?.displayName || file?.name || undefined}
            >
              {file?.displayName || file?.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 overflow-auto">
          {shouldGateLargePreview && (
            <LargeFilePreview
              file={file}
              url={url}
              type={previewTypeLabel}
              onPreview={() => setPreviewLargeFileId(file?.id ?? null)}
            />
          )}

          {!shouldGateLargePreview && url && previewType === 'image' && (
            <div className="relative flex h-full items-center justify-center p-4">
              {isEmbeddedFileLoading && <FileLoadingOverlay />}
              <img
                src={url}
                alt={file?.displayName || file?.name || undefined}
                className="max-h-full max-w-full rounded-md object-contain"
                onLoad={markEmbeddedPreviewLoaded}
                onError={markEmbeddedPreviewLoaded}
              />
            </div>
          )}

          {!shouldGateLargePreview && url && previewType === 'pdf' && (
            <div className="relative h-full w-full">
              {isEmbeddedFileLoading && <FileLoadingOverlay />}
              <iframe
                src={url}
                title={file?.displayName || file?.name || undefined}
                className="h-full w-full rounded-md border"
                onLoad={markEmbeddedPreviewLoaded}
              />
            </div>
          )}

          {!shouldGateLargePreview && url && previewType === 'video' && (
            <div className="relative flex h-full items-center justify-center p-4">
              {isEmbeddedFileLoading && <FileLoadingOverlay />}
              <video
                src={url}
                controls
                className="max-h-full max-w-full rounded-md"
                onLoadedData={markEmbeddedPreviewLoaded}
                onError={markEmbeddedPreviewLoaded}
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {!shouldGateLargePreview && url && previewType === 'audio' && (
            <div className="relative flex h-full flex-col items-center justify-center gap-6">
              {isEmbeddedFileLoading && <FileLoadingOverlay />}
              <FileTypeIcon
                fileType="FILE"
                mimeType={file?.mimeType}
                fileName={file?.displayName || file?.name || ''}
                className="size-16"
              />
              <audio
                src={url}
                controls
                className="w-full max-w-md"
                onLoadedMetadata={markEmbeddedPreviewLoaded}
                onError={markEmbeddedPreviewLoaded}
              >
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {isTextContentLoading &&
            (previewType === 'text' || (previewType === 'spreadsheet' && canPreviewDelimited)) && (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading preview...</p>
              </div>
            )}

          {isTextContentError &&
            (previewType === 'text' || (previewType === 'spreadsheet' && canPreviewDelimited)) && (
              <PreviewMessage message={textPreviewErrorMessage ?? 'Failed to load preview.'} />
            )}

          {!isTextContentLoading &&
            !isTextContentError &&
            previewType === 'spreadsheet' &&
            canPreviewDelimited && (
              <div className="flex h-full min-h-0 flex-col gap-2">
                {textPreviewNotice && (
                  <p className="shrink-0 text-xs text-muted-foreground">{textPreviewNotice}</p>
                )}
                <div className="min-h-0 flex-1">
                  <SpreadsheetPreview rows={spreadsheetRows} />
                </div>
              </div>
            )}

          {!isTextContentLoading &&
            !isTextContentError &&
            previewType === 'text' &&
            textContent != null && (
              <div className="flex h-full min-h-0 flex-col gap-2">
                {textPreviewNotice && (
                  <p className="shrink-0 text-xs text-muted-foreground">{textPreviewNotice}</p>
                )}
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-4 font-mono text-xs">
                  {textContent}
                </pre>
              </div>
            )}

          {!shouldGateLargePreview && previewType === 'spreadsheet' && !canPreviewDelimited && (
            <FallbackPreview file={file} url={url} type="Spreadsheet" />
          )}

          {!shouldGateLargePreview && previewType === 'document' && (
            <FallbackPreview file={file} url={url} type="Document" />
          )}

          {!shouldGateLargePreview && previewType === 'archive' && (
            <FallbackPreview file={file} url={url} type="Archive" />
          )}

          {!shouldGateLargePreview && previewType === 'generic' && (
            <FallbackPreview file={file} url={url} type="File" />
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={!file}>
            <Download className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
