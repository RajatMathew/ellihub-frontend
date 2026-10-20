import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Progress } from '@/app/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import {
  shouldSniffForEmail,
  sniffEmailMessage,
} from '@/modules/email/lib/email-attachment-preview';
import { EMAIL_ITEM_ATTACHMENT_MIME_TYPE } from '@/modules/email/lib/email-attachments';
import { FILE_TEXT_PREVIEW_BYTES, filesApi } from '@/modules/files/api/files.api';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import { useDownloadFile, useTextContentQuery } from '@/modules/files/hooks/files.hooks';
import { isDocxPreviewable } from '@/modules/files/lib/file-preview-docx';
import { filePreviewLoadKey } from '@/modules/files/lib/file-preview-load';
import { isWorkbookPreviewable } from '@/modules/files/lib/file-preview-spreadsheet';
import { SaveToFilesTrigger, type SaveToFilesScope } from '@/modules/files/save-to-files';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Download, Eye, FolderPlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { FileTypeIcon } from './file-type-icon';

const DocxPreview = lazy(() =>
  import('./docx-preview').then((module) => ({ default: module.DocxPreview }))
);
const WorkbookPreview = lazy(() =>
  import('./spreadsheet-preview').then((module) => ({ default: module.WorkbookPreview }))
);
const AttachedEmailPreview = lazy(() =>
  import('@/modules/email/components/attached-email-preview').then((module) => ({
    default: module.AttachedEmailPreview,
  }))
);

export type FilePreviewItem = Pick<FileItem, 'id'> & Partial<FileItem>;

type PreviewType =
  | 'image'
  | 'pdf'
  | 'email'
  | 'docx'
  | 'workbook'
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
const SPREADSHEET_EXTENSIONS = ['csv', 'tsv', 'xls', 'xlsx', 'xlsm', 'ods'];
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
  'eml',
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
    'message/rfc822': 'eml',
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
  if (mime === EMAIL_ITEM_ATTACHMENT_MIME_TYPE || extension === 'eml') return 'email';
  if (isDocxPreviewable(item)) return 'docx';
  if (isWorkbookPreviewable(item)) return 'workbook';
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
    case 'email':
      return 'Email';
    case 'docx':
      return 'Document';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'workbook':
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
    previewType === 'email' ||
    previewType === 'docx' ||
    previewType === 'workbook' ||
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

function FileDownloadingState({
  progress,
  fileSize,
}: {
  progress: FilePreviewLoadProgress | null | undefined;
  fileSize?: number;
}) {
  const total = progress?.total ?? (fileSize && fileSize > 0 ? fileSize : null);
  const percent =
    progress && total ? Math.min(100, Math.round((progress.loaded / total) * 100)) : null;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {percent != null ? `Downloading… ${percent}%` : 'Downloading…'}
      </p>
      {percent != null && <Progress value={percent} className="w-full max-w-xs" />}
      {progress && progress.loaded > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatFileSize(progress.loaded)}
          {total ? ` of ${formatFileSize(total)}` : ''}
        </p>
      )}
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

export interface FilePreviewLoadProgress {
  loaded: number;
  total: number | null;
}

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FilePreviewItem | null;
  loadFile?: (file: FilePreviewItem) => Promise<Blob>;
  /**
   * Live download progress for the `loadFile` fetch, when the caller can report
   * it. Shown while the blob is still downloading so large files don't sit on a
   * blank screen.
   */
  loadProgress?: FilePreviewLoadProgress | null;
  /**
   * Opt-in "Save to Files" action in the header. Requires `loadFile` so the
   * lazy source can fetch the bytes once the user picks a destination folder.
   */
  saveToFiles?: {
    rootFolderId?: string;
    rootLabel?: string;
    projectScopes?: readonly SaveToFilesScope[];
    onSaved?: (savedFile: FileItem) => void;
  } | null;
}

function PreviewActions({
  file,
  onPreview,
  showPreviewAction,
  onDownload,
}: {
  file: FilePreviewItem | null;
  onPreview?: () => void;
  showPreviewAction?: boolean;
  /** Override for lazily-loaded files (e.g. email attachments) that the files download endpoint can't resolve. */
  onDownload?: () => void;
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
        onClick={() => {
          if (!file) return;
          if (onDownload) {
            onDownload();
            return;
          }
          downloadFile.mutate(file);
        }}
        disabled={!file}
      >
        <Download className="size-3.5" />
        Download
      </Button>
    </div>
  );
}

function FallbackPreview({
  file,
  type,
  onDownload,
}: {
  file: FilePreviewItem | null;
  type: string;
  onDownload?: () => void;
}) {
  const displayName = getDisplayNameWithExtension(file);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <FileTypeIcon
          fileType="FILE"
          presentation="badge"
          mimeType={file?.mimeType}
          fileName={displayName}
          className="mb-4 size-12 rounded-lg"
        />
        <p className="text-sm font-semibold text-foreground">Preview not available</p>
        <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
          {type === 'Document'
            ? 'This document format cannot be previewed here. Download the file to open it.'
            : `This ${type.toLowerCase()} can be downloaded.`}
        </p>

        <div className="mt-4">
          <PreviewActions file={file} onDownload={onDownload} />
        </div>
      </div>
    </div>
  );
}

function LargeFilePreview({
  file,
  type,
  onPreview,
  onDownload,
}: {
  file: FilePreviewItem | null;
  type: string;
  onPreview: () => void;
  onDownload?: () => void;
}) {
  const displayName = getDisplayNameWithExtension(file);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <FileTypeIcon
        fileType="FILE"
        presentation="badge"
        mimeType={file?.mimeType}
        fileName={displayName}
        className="size-16 rounded-lg"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Large preview paused</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {type} is {formatFileSize(file?.size)}. Open it in a new tab, download it, or preview it
          here when needed.
        </p>
      </div>
      <PreviewActions file={file} onPreview={onPreview} showPreviewAction onDownload={onDownload} />
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
  loadProgress,
  saveToFiles,
}: FilePreviewDialogProps) {
  const isFile = open && !!file && file.type !== 'FOLDER';
  const statedPreviewType = file ? getPreviewType(file) : 'generic';
  const canPreviewDelimited = isDelimitedSpreadsheet(file);
  const [loadedFilePreviewKey, setLoadedFilePreviewKey] = useState<string | null>(null);
  const [previewLargeFileId, setPreviewLargeFileId] = useState<string | null>(null);
  const [downloadTooltipOpen, setDownloadTooltipOpen] = useState(false);
  // Keyed by file id so a result (or failure) from a previously previewed file
  // is ignored instead of needing a synchronous reset inside the effect.
  const [blobResult, setBlobResult] = useState<{
    fileId: string;
    blob: Blob | null;
    failed: boolean;
  } | null>(null);
  // The file to fetch, but not the object it arrived in — see
  // `filePreviewLoadKey`. Callers build that object inline, so keying the load
  // on its reference made every re-render of the caller look like a new file,
  // and a `loadFile` that reports progress re-renders the caller (elli-ui#975).
  const loadKey = filePreviewLoadKey({ open, file, hasLoader: Boolean(loadFile) });
  // The key says *whether* and *what* to load; this is the object to hand the
  // loader, kept out of the load effect's dependencies so its churn cannot
  // restart a download. Synced in its own effect — effects run in declaration
  // order, so it is current before the load below reads it.
  const fileRef = useRef(file);
  useEffect(() => {
    fileRef.current = file;
  }, [file]);
  useEffect(() => {
    const target = fileRef.current;
    if (!loadKey || !loadFile || !target) return;
    let active = true;
    const fileId = target.id;
    loadFile(target)
      .then((blob) => active && setBlobResult({ fileId, blob, failed: false }))
      .catch(() => active && setBlobResult({ fileId, blob: null, failed: true }));
    return () => {
      active = false;
    };
  }, [loadKey, loadFile]);
  const loadedBlob = open && blobResult && blobResult.fileId === file?.id ? blobResult.blob : null;
  const blobLoadError = open && !!blobResult && blobResult.fileId === file?.id && blobResult.failed;
  // An attached Outlook item synced before elli-core typed it is stored with
  // no type and no extension, so only its bytes say it is an email
  // (elli-ui#1499). Read the start of a file whose type says nothing; a file
  // that states a type is shown as that type.
  const [sniffedEmailFileId, setSniffedEmailFileId] = useState<string | null>(null);
  const fileId = file?.id;
  const sniffsForEmail =
    statedPreviewType === 'generic' && shouldSniffForEmail(file?.mimeType) && !!loadedBlob;
  useEffect(() => {
    if (!sniffsForEmail || !loadedBlob || !fileId) return;
    let active = true;
    void sniffEmailMessage(loadedBlob).then((isEmail) => {
      if (active && isEmail) setSniffedEmailFileId(fileId);
    });
    return () => {
      active = false;
    };
  }, [fileId, loadedBlob, sniffsForEmail]);
  const isSniffedEmail = open && !!fileId && sniffedEmailFileId === fileId;
  const previewType: PreviewType = isSniffedEmail ? 'email' : statedPreviewType;
  const previewTypeLabel = getPreviewTypeLabel(previewType);
  // What the file is, once sniffed: named and saved as an `.eml`, not as a
  // bare subject line the operating system cannot open.
  const viewFile =
    isSniffedEmail && file ? { ...file, mimeType: EMAIL_ITEM_ATTACHMENT_MIME_TYPE } : file;
  const blobUrl = useMemo(
    () => (loadedBlob ? URL.createObjectURL(loadedBlob) : undefined),
    [loadedBlob]
  );
  useEffect(
    () => () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
    [blobUrl]
  );
  const url = isFile
    ? (blobUrl ?? (loadFile ? undefined : filesApi.getFileReadUrl(file.id)))
    : undefined;
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
  const displayName = getDisplayNameWithExtension(viewFile);
  const isBlobLoading = isFile && !!loadFile && !loadedBlob && !blobLoadError;
  const saveBlobToDisk = (blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = displayName || 'download';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  };
  const handleDownload = () => {
    if (!file) return;
    if (loadedBlob) {
      saveBlobToDisk(loadedBlob);
      return;
    }
    if (loadFile) {
      // The file only exists behind the lazy loader (e.g. an email attachment) —
      // the generic files download endpoint doesn't know this id.
      loadFile(file)
        .then(saveBlobToDisk)
        .catch(() => toast.error('Failed to download the file.'));
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
        // Focus the dialog itself on open, not its first header button. Radix
        // would otherwise land on "Add to folder" and draw its focus ring as if
        // the reader had tabbed there (elli-ui#1364). Tab still reaches every
        // control, and focus stays trapped inside.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
        }}
      >
        <DialogHeader className="mb-0 flex h-12 shrink-0 flex-row items-center justify-between gap-4 border-b border-border/70 bg-background px-4 py-0 text-start">
          <DialogTitle
            className="flex min-w-0 flex-1 items-center gap-2 text-sm leading-none font-semibold tracking-normal text-foreground"
            style={{ fontFamily: '"Public Sans", "IBM Plex Sans", system-ui, sans-serif' }}
          >
            <FileTypeIcon
              fileType={file?.type ?? 'FILE'}
              mimeType={viewFile?.mimeType}
              fileName={displayName}
              className={file?.type === 'FOLDER' ? 'size-4 shrink-0' : 'size-6'}
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
              <SaveToFilesTrigger
                asChild
                source={{
                  kind: 'lazy',
                  fileName: displayName || 'download',
                  mimeType: viewFile?.mimeType ?? undefined,
                  resolve: () => loadFile(file),
                }}
                rootFolderId={saveToFiles.rootFolderId}
                rootLabel={saveToFiles.rootLabel ?? 'Project Files'}
                projectScopes={saveToFiles.projectScopes}
                onSaved={(savedFile) => saveToFiles.onSaved?.(savedFile)}
              >
                {/* Labelled, and in the attachment menu's words (elli-ui#1364):
                    a bare folder icon read as "open folder", not "file this". */}
                <Button variant="outline" size="toolbar" aria-label="Add to folder">
                  <FolderPlus aria-hidden="true" />
                  <span className="hidden sm:inline">Add to folder</span>
                </Button>
              </SaveToFilesTrigger>
            )}
            <Tooltip open={downloadTooltipOpen}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  mode="icon"
                  size="icon"
                  className="size-9"
                  onClick={handleDownload}
                  onPointerEnter={() => setDownloadTooltipOpen(true)}
                  onPointerLeave={() => setDownloadTooltipOpen(false)}
                  onBlur={() => setDownloadTooltipOpen(false)}
                  disabled={!file}
                  aria-label="Download file"
                >
                  <Download aria-hidden="true" />
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
              onDownload={loadFile ? handleDownload : undefined}
            />
          )}

          {!shouldGateLargePreview &&
            !url &&
            hasEmbeddedLoadState(previewType) &&
            isBlobLoading && (
              <FileDownloadingState progress={loadProgress} fileSize={file?.size ?? undefined} />
            )}

          {!shouldGateLargePreview &&
            !url &&
            hasEmbeddedLoadState(previewType) &&
            blobLoadError && (
              <PreviewMessage message="Failed to load the preview. Close and try again." />
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

          {!shouldGateLargePreview && url && previewType === 'email' && (
            <Suspense fallback={<FileLoadingOverlay />}>
              <AttachedEmailPreview source={loadedBlob ?? url} />
            </Suspense>
          )}

          {!shouldGateLargePreview && url && previewType === 'docx' && (
            <Suspense fallback={<FileLoadingOverlay />}>
              <DocxPreview source={loadedBlob ?? url} />
            </Suspense>
          )}

          {!shouldGateLargePreview && url && previewType === 'workbook' && (
            <Suspense fallback={<FileLoadingOverlay />}>
              <WorkbookPreview source={loadedBlob ?? url} />
            </Suspense>
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
                presentation="badge"
                mimeType={file?.mimeType}
                fileName={displayName}
                className="size-16 rounded-lg"
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
            <FallbackPreview
              file={file}
              type="Spreadsheet"
              onDownload={loadFile ? handleDownload : undefined}
            />
          )}

          {!shouldGateLargePreview && previewType === 'document' && (
            <FallbackPreview
              file={file}
              type="Document"
              onDownload={loadFile ? handleDownload : undefined}
            />
          )}

          {!shouldGateLargePreview && previewType === 'archive' && (
            <FallbackPreview
              file={file}
              type="Archive"
              onDownload={loadFile ? handleDownload : undefined}
            />
          )}

          {!shouldGateLargePreview && previewType === 'generic' && (
            <FallbackPreview
              file={file}
              type="File"
              onDownload={loadFile ? handleDownload : undefined}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
