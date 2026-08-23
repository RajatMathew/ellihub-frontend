import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { FILE_TEXT_PREVIEW_BYTES, filesApi } from '@/modules/files/api/files.api';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import { useDownloadFile, useTextContentQuery } from '@/modules/files/hooks/files.hooks';
import { SaveToFilesTrigger } from '@/modules/files/save-to-files';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Download, Eye, FolderPlus, Loader2, X } from 'lucide-react';

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
const KNOWN_FILE_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...SPREADSHEET_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
  ...ARCHIVE_EXTENSIONS,
  ...TEXT_EXTENSIONS,
  'dwg',
  'dxf',
  'heic',
  'heif',
  'ifc',
  'mpp',
  'nwc',
  'nwd',
  'pdf',
  'rfa',
  'rvt',
  'skp',
  'tif',
  'tiff',
]);

function getKnownExtensionFromName(name: string | null | undefined): string | null {
  if (!name) return null;

  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex >= name.length - 1) return null;

  const extension = name.slice(dotIndex + 1).toLowerCase();
  return KNOWN_FILE_EXTENSIONS.has(extension) ? extension : null;
}

function getExtensionFromMimeType(mimeType: string | null | undefined): string | null {
  if (!mimeType) return null;

  const mimeToExtension: Record<string, string> = {
    'application/msword': 'doc',
    'application/pdf': 'pdf',
    'application/rtf': 'rtf',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.ms-project': 'mpp',
    'application/vnd.ms-excel.sheet.macroenabled.12': 'xlsm',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/x-7z-compressed': '7z',
    'application/x-zip-compressed': 'zip',
    'application/zip': 'zip',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/jpeg': 'jpg',
    'image/pjpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tif',
    'image/vnd.dwg': 'dwg',
    'image/vnd.dxf': 'dxf',
    'image/webp': 'webp',
    'text/csv': 'csv',
    'text/plain': 'txt',
    'text/xml': 'xml',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };

  return mimeToExtension[mimeType.toLowerCase()] ?? null;
}

function getExtension(item: FilePreviewItem | null): string {
  return (
    getKnownExtensionFromName(item?.displayName) ??
    getKnownExtensionFromName(item?.name) ??
    getKnownExtensionFromName(item?.objectId) ??
    getExtensionFromMimeType(item?.mimeType) ??
    ''
  );
}

function getDisplayNameWithExtension(item: FilePreviewItem | null): string {
  const displayName = item?.displayName || item?.name || '';
  if (!displayName || getKnownExtensionFromName(displayName)) return displayName;

  const extension =
    getKnownExtensionFromName(item?.name) ??
    getKnownExtensionFromName(item?.objectId) ??
    getExtensionFromMimeType(item?.mimeType);

  return extension ? `${displayName}.${extension}` : displayName;
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
  loadFile?: (file: FilePreviewItem) => Promise<Blob>;
  /**
   * Opt-in "Save to Files" action in the header. Requires `loadFile` so the
   * lazy source can fetch the bytes once the user picks a destination folder.
   */
  saveToFiles?: {
    rootFolderId?: string;
    rootLabel?: string;
    onSaved?: (savedFile: FileItem) => void;
  } | null;
}

function PreviewActions({
  file,
  onPreview,
  showPreviewAction,
}: {
  file: FilePreviewItem | null;
  onPreview?: () => void;
  showPreviewAction?: boolean;
}) {
  const downloadFile = useDownloadFile();

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {showPreviewAction && onPreview && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs"
          onClick={onPreview}
        >
          <Eye className="size-3.5" />
          Preview anyway
        </Button>
      )}
      <Button
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs"
        onClick={() => file && downloadFile.mutate(file)}
        disabled={!file}
      >
        <Download className="size-3.5" />
        Download
      </Button>
    </div>
  );
}

function FallbackPreview({ file, type }: { file: FilePreviewItem | null; type: string }) {
  const displayName = getDisplayNameWithExtension(file);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-md border border-border bg-background shadow-xs">
          <FileTypeIcon
            fileType="FILE"
            mimeType={file?.mimeType}
            fileName={displayName}
            className="size-6"
          />
        </div>
        <p className="text-sm font-semibold text-foreground">Preview not available</p>
        <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
          {type === 'Document'
            ? 'DOCX content cannot be previewed here. Download the file to open it.'
            : `This ${type.toLowerCase()} can be downloaded.`}
        </p>

        <div className="mt-4">
          <PreviewActions file={file} />
        </div>
      </div>
    </div>
  );
}

function LargeFilePreview({
  file,
  type,
  onPreview,
}: {
  file: FilePreviewItem | null;
  type: string;
  onPreview: () => void;
}) {
  const displayName = getDisplayNameWithExtension(file);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <FileTypeIcon
        fileType="FILE"
        mimeType={file?.mimeType}
        fileName={displayName}
        className="size-16 text-muted-foreground/50"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Large preview paused</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {type} is {formatFileSize(file?.size)}. Open it in a new tab, download it, or preview it
          here when needed.
        </p>
      </div>
      <PreviewActions file={file} onPreview={onPreview} showPreviewAction />
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

export function FilePreviewDialog({
  open,
  onOpenChange,
  file,
  loadFile,
  saveToFiles,
}: FilePreviewDialogProps) {
  const isFile = open && !!file && file.type !== 'FOLDER';
  const previewType = file ? getPreviewType(file) : 'generic';
  const previewTypeLabel = getPreviewTypeLabel(previewType);
  const canPreviewDelimited = isDelimitedSpreadsheet(file);
  const [loadedFilePreviewKey, setLoadedFilePreviewKey] = useState<string | null>(null);
  const [previewLargeFileId, setPreviewLargeFileId] = useState<string | null>(null);
  const [downloadTooltipOpen, setDownloadTooltipOpen] = useState(false);
  const [loadedBlob, setLoadedBlob] = useState<Blob | null>(null);
  useEffect(() => {
    setLoadedBlob(null);
    if (!open || !file || !loadFile) return;
    let active = true;
    const fetchBlob = loadFile(file);
    fetchBlob.then((blob) => active && setLoadedBlob(blob));
    return () => { active = false; };
  }, [file, loadFile, open]);
  const blobUrl = useMemo(() => (loadedBlob ? URL.createObjectURL(loadedBlob) : undefined), [loadedBlob]);
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);
  const url = isFile ? (blobUrl ?? (loadFile ? undefined : filesApi.getFileReadUrl(file.id))) : undefined;
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
  const displayName = getDisplayNameWithExtension(file);
  const handleDownload = () => {
    if (!file) return;
    if (loadedBlob) {
      const anchor = document.createElement('a');
      anchor.href = blobUrl ?? URL.createObjectURL(loadedBlob);
      anchor.download = getDisplayNameWithExtension(file) || 'download';
      anchor.click();
      return;
    }
    downloadFile.mutate(file);
  };

  const markEmbeddedPreviewLoaded = () => {
    setLoadedFilePreviewKey(embeddedPreviewKey);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="fullscreen"
        showCloseButton={false}
        className="inset-x-[4vw] inset-y-[4vh] gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-2xl shadow-black/25 sm:rounded-md"
      >
        <DialogHeader className="mb-0 flex h-12 shrink-0 flex-row items-center justify-between gap-4 border-b border-border/70 bg-background px-4 py-0 text-start">
          <DialogTitle
            className="flex min-w-0 flex-1 items-center gap-2 text-sm leading-none font-semibold tracking-normal text-foreground"
            style={{ fontFamily: '"Public Sans", "IBM Plex Sans", system-ui, sans-serif' }}
          >
            <FileTypeIcon
              fileType={file?.type ?? 'FILE'}
              mimeType={file?.mimeType}
              fileName={displayName}
              className="size-4 shrink-0 stroke-[2.2]"
            />
            <span
              className="min-w-0 flex-1 truncate"
              title={displayName || undefined}
              style={{ fontFamily: '"Public Sans", "IBM Plex Sans", system-ui, sans-serif' }}
            >
              {displayName}
            </span>
          </DialogTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            {saveToFiles && file && loadFile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SaveToFilesTrigger
                    asChild
                    source={{
                      kind: 'lazy',
                      fileName: getDisplayNameWithExtension(file) || 'download',
                      mimeType: file.mimeType ?? undefined,
                      resolve: () => loadFile(file),
                    }}
                    rootFolderId={saveToFiles.rootFolderId}
                    rootLabel={saveToFiles.rootLabel ?? 'Project Files'}
                    onSaved={(savedFile) => saveToFiles.onSaved?.(savedFile)}
                  >
                    <Button
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      className="size-9 rounded-sm border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Save to Files"
                    >
                      <FolderPlus className="size-4" />
                    </Button>
                  </SaveToFilesTrigger>
                </TooltipTrigger>
                <TooltipContent>Save to Files</TooltipContent>
              </Tooltip>
            )}
            <Tooltip open={downloadTooltipOpen}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  className="size-9 rounded-sm border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={handleDownload}
                  onPointerEnter={() => setDownloadTooltipOpen(true)}
                  onPointerLeave={() => setDownloadTooltipOpen(false)}
                  onBlur={() => setDownloadTooltipOpen(false)}
                  disabled={!file}
                  aria-label="Download file"
                >
                  <Download className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download file</TooltipContent>
            </Tooltip>
            <DialogClose asChild>
              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                className="size-8 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close preview"
              >
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 overflow-auto bg-muted">
          {shouldGateLargePreview && (
            <LargeFilePreview
              file={file}
              type={previewTypeLabel}
              onPreview={() => setPreviewLargeFileId(file?.id ?? null)}
            />
          )}

          {!shouldGateLargePreview && url && previewType === 'image' && (
            <div className="relative flex h-full items-center justify-center p-4">
              {isEmbeddedFileLoading && <FileLoadingOverlay />}
              <img
                src={url}
                alt={displayName || undefined}
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
                title={displayName || undefined}
                className="h-full w-full border-0"
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
                fileName={displayName}
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
            <FallbackPreview file={file} type="Spreadsheet" />
          )}

          {!shouldGateLargePreview && previewType === 'document' && (
            <FallbackPreview file={file} type="Document" />
          )}

          {!shouldGateLargePreview && previewType === 'archive' && (
            <FallbackPreview file={file} type="Archive" />
          )}

          {!shouldGateLargePreview && previewType === 'generic' && (
            <FallbackPreview file={file} type="File" />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
