import { useCallback, useMemo, useRef, useState } from 'react';

import {
  AlertTriangle,
  FileAudio,
  FileCode,
  FileIcon,
  FileSpreadsheet,
  FileText,
  FileUp,
  FileVideo,
  Image as ImageIcon,
  X,
} from 'lucide-react';

import { Button } from '@app/components/ui/button';

// ── Helpers ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ── Blocked extensions (executables, scripts, system files) ──────────

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif',
  'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'ps1',
  'reg', 'dll', 'sys', 'cpl', 'inf', 'hta', 'lnk',
  'sh', 'bash', 'csh', 'ksh',
]);

function getExtension(name: string): string {
  const dotIdx = name.lastIndexOf('.');
  return dotIdx > 0 ? name.slice(dotIdx + 1).toLowerCase() : '';
}

function validateFile(
  file: File,
  maxSize?: number,
): string | null {
  const ext = getExtension(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return `File type ".${ext}" is not allowed for security reasons.`;
  }
  if (maxSize && file.size > maxSize) {
    return `File is too large. Maximum size is ${formatBytes(maxSize)}.`;
  }
  return null;
}

// ── Preview helpers ─────────────────────────────────────────────────

function isImageType(file: File): boolean {
  return file.type.startsWith('image/');
}


function FileIconDisplay({ file }: { file: File }) {
  const mime = file.type;
  const ext = getExtension(file.name);
  const cls = "size-6 text-muted-foreground";

  if (mime.startsWith('image/')) return <ImageIcon className={cls} />;
  if (mime.startsWith('video/')) return <FileVideo className={cls} />;
  if (mime.startsWith('audio/')) return <FileAudio className={cls} />;
  if (mime === 'application/pdf' || ext === 'pdf') return <FileText className={cls} />;
  if (
    ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext) ||
    mime.includes('wordprocessing') ||
    mime.includes('msword') ||
    mime.startsWith('text/')
  )
    return <FileText className={cls} />;
  if (
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel')
  )
    return <FileSpreadsheet className={cls} />;
  if (
    ['json', 'xml', 'html', 'css', 'ts', 'tsx', 'jsx', 'py', 'java', 'yml', 'yaml'].includes(ext) ||
    mime.includes('json') ||
    mime.includes('xml')
  )
    return <FileCode className={cls} />;

  return <FileIcon className={cls} />;
}

// ── Component ───────────────────────────────────────────────────────

interface FileDropZoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}

export function FileDropZone({
  value,
  onChange,
  accept,
  maxSize,
  disabled,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tryAcceptFile = useCallback(
    (file: File) => {
      const err = validateFile(file, maxSize);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onChange(file);
    },
    [onChange, maxSize],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) tryAcceptFile(file);
    },
    [tryAcceptFile, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) tryAcceptFile(file);
      e.target.value = '';
    },
    [tryAcceptFile],
  );

  const handleRemove = useCallback(() => {
    setError(null);
    onChange(null);
  }, [onChange]);

  // Image preview URL
  const previewUrl = useMemo(() => {
    if (value && isImageType(value)) return URL.createObjectURL(value);
    return null;
  }, [value]);

  // Selected file preview
  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
          {/* Preview thumbnail or icon */}
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={value.name}
              className="size-12 shrink-0 rounded-md object-cover border"
              onLoad={() => {
                // Revoke on unmount would be ideal, but onLoad is fine for short-lived dialogs
              }}
            />
          ) : (
            <div className="flex items-center justify-center size-12 shrink-0 rounded-md bg-muted">
              <FileIconDisplay file={value} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(value.size)}
              {value.type && ` · ${value.type}`}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0 shrink-0"
            type="button"
            disabled={disabled}
            onClick={handleRemove}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Drop zone
  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : isDragOver
              ? 'cursor-pointer border-primary bg-primary/5'
              : error
                ? 'cursor-pointer border-destructive/50'
                : 'cursor-pointer border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <FileUp
          className={`size-10 ${isDragOver ? 'text-primary' : 'text-muted-foreground/50'}`}
        />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragOver ? 'Drop file here' : 'Drag & drop a file here'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleInputChange}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
