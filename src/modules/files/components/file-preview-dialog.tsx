import { useMemo } from 'react';

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
import { formatFileSize } from '@/modules/files/constants/files.constants';
import {
  useDownloadFile,
  useFilePreviewQuery,
  useTextContentQuery,
} from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Download, ExternalLink, Eye, Loader2 } from 'lucide-react';

import { FileTypeIcon } from './file-type-icon';

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

function getExtension(item: FileItem | null): string {
  return (item?.displayName || item?.name || '').split('.').pop()?.toLowerCase() ?? '';
}

function getPreviewType(item: FileItem): PreviewType {
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

function isDelimitedSpreadsheet(item: FileItem | null): boolean {
  const mime = item?.mimeType ?? '';
  const extension = getExtension(item);

  return mime === 'text/csv' || DELIMITED_SPREADSHEET_EXTENSIONS.includes(extension);
}

function getDelimiter(item: FileItem | null): string {
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
  file: FileItem | null;
}

function FallbackPreview({
  file,
  url,
  type,
}: {
  file: FileItem | null;
  url?: string;
  type: string;
}) {
  const downloadFile = useDownloadFile();

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
          {type} files can still be downloaded from this window.
        </p>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 sm:text-left">
        <span>Type</span>
        <span className="font-medium text-foreground">{file?.mimeType || type}</span>
        <span>Size</span>
        <span className="font-medium text-foreground">{formatFileSize(file?.size)}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {url && (
          <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
            <ExternalLink className="size-3.5" />
            Open
          </Button>
        )}
        <Button size="sm" onClick={() => file && downloadFile.mutate(file)} disabled={!file}>
          <Download className="size-3.5" />
          Download
        </Button>
      </div>
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
  const canPreviewDelimited = isDelimitedSpreadsheet(file);
  const {
    data: url,
    error: previewError,
    isLoading,
    isError,
  } = useFilePreviewQuery(isFile ? file?.id : undefined, isFile);
  const previewErrorMessage = isError
    ? getApiErrorMessage(previewError, 'Failed to load preview.')
    : undefined;
  const { data: textContent } = useTextContentQuery(
    url,
    isFile && !!url && (previewType === 'text' || canPreviewDelimited)
  );
  const spreadsheetRows = useMemo(
    () =>
      textContent && canPreviewDelimited ? parseDelimitedRows(textContent, getDelimiter(file)) : [],
    [canPreviewDelimited, file, textContent]
  );
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
              <p className="text-sm text-muted-foreground">{previewErrorMessage}</p>
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

          {!isLoading && !isError && previewType === 'spreadsheet' && canPreviewDelimited && (
            <SpreadsheetPreview rows={spreadsheetRows} />
          )}

          {!isLoading && !isError && previewType === 'text' && textContent != null && (
            <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-4 font-mono text-xs">
              {textContent}
            </pre>
          )}

          {!isLoading && !isError && previewType === 'spreadsheet' && !canPreviewDelimited && (
            <FallbackPreview file={file} url={url} type="Spreadsheet" />
          )}

          {!isLoading && !isError && previewType === 'document' && (
            <FallbackPreview file={file} url={url} type="Document" />
          )}

          {!isLoading && !isError && previewType === 'archive' && (
            <FallbackPreview file={file} url={url} type="Archive" />
          )}

          {!isLoading && !isError && previewType === 'generic' && (
            <FallbackPreview file={file} url={url} type="File" />
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={!file || downloadFile.isPending}>
            <Download className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
