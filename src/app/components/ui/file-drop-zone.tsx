import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactElement,
} from 'react';

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

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import {
  FILE_UPLOAD_ACCEPT,
  MAX_UPLOAD_BYTES,
  formatUploadFileSize,
  getUploadFileExtension,
  getUploadFileValidationError,
} from '@/modules/files/lib/file-upload-policy';

function getExtension(name: string): string {
  return getUploadFileExtension(name);
}

function isImageType(file: File): boolean {
  return file.type.startsWith('image/');
}

function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function mergeFiles(currentFiles: File[], incomingFiles: File[]): File[] {
  const seen = new Set(currentFiles.map(getFileKey));
  const nextFiles = [...currentFiles];

  for (const file of incomingFiles) {
    const key = getFileKey(file);

    if (!seen.has(key)) {
      seen.add(key);
      nextFiles.push(file);
    }
  }

  return nextFiles;
}

export function FileIconDisplay({
  file,
  className,
}: {
  file: File;
  className?: string;
}) {
  const mime = file.type;
  const ext = getExtension(file.name);
  const iconClassName = cn('size-6 text-muted-foreground', className);

  if (mime.startsWith('image/')) return <ImageIcon className={iconClassName} />;
  if (mime.startsWith('video/')) return <FileVideo className={iconClassName} />;
  if (mime.startsWith('audio/')) return <FileAudio className={iconClassName} />;
  if (mime === 'application/pdf' || ext === 'pdf') return <FileText className={iconClassName} />;
  if (
    ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext) ||
    mime.includes('wordprocessing') ||
    mime.includes('msword') ||
    mime.startsWith('text/')
  ) {
    return <FileText className={iconClassName} />;
  }
  if (
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel')
  ) {
    return <FileSpreadsheet className={iconClassName} />;
  }
  if (
    ['json', 'xml', 'html', 'css', 'ts', 'tsx', 'jsx', 'py', 'java', 'yml', 'yaml'].includes(ext) ||
    mime.includes('json') ||
    mime.includes('xml')
  ) {
    return <FileCode className={iconClassName} />;
  }

  return <FileIcon className={iconClassName} />;
}

interface FilePreviewProps {
  file: File;
}

function FilePreview({ file }: FilePreviewProps) {
  const previewUrl = useMemo(() => {
    if (isImageType(file)) return URL.createObjectURL(file);

    return null;
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={file.name}
        className="size-12 shrink-0 rounded-md border object-cover"
      />
    );
  }

  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
      <FileIconDisplay file={file} />
    </div>
  );
}

interface FileDropZoneBaseProps {
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  showSelectedPreview?: boolean;
  className?: string;
  testId?: string;
}

interface SingleFileDropZoneProps extends FileDropZoneBaseProps {
  multiple?: false;
  value: File | null;
  onChange: (file: File | null) => void;
}

interface MultipleFileDropZoneProps extends FileDropZoneBaseProps {
  multiple: true;
  value: File[];
  onChange: (files: File[]) => void;
}

type FileDropZoneProps = SingleFileDropZoneProps | MultipleFileDropZoneProps;

export function FileDropZone(props: SingleFileDropZoneProps): ReactElement;
export function FileDropZone(props: MultipleFileDropZoneProps): ReactElement;
export function FileDropZone(props: FileDropZoneProps): ReactElement {
  const {
    accept = FILE_UPLOAD_ACCEPT,
    className,
    disabled = false,
    maxSize = MAX_UPLOAD_BYTES,
    showSelectedPreview = true,
  } = props;
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedFiles = props.multiple ? props.value : props.value ? [props.value] : [];
  const isMultiple = props.multiple === true;
  const hasSelectedFiles = selectedFiles.length > 0;
  const shouldShowDropZone = isMultiple || !hasSelectedFiles || !showSelectedPreview;

  function commitFiles(files: File[]) {
    if (files.length === 0) return;

    const acceptedFiles: File[] = [];
    const rejectedMessages: string[] = [];

    for (const file of files) {
      const validationError = getUploadFileValidationError(file, { accept, maxSize });

      if (validationError) {
        rejectedMessages.push(`${file.name}: ${validationError}`);
      } else {
        acceptedFiles.push(file);
      }
    }

    if (rejectedMessages.length > 0) {
      setError(
        rejectedMessages.length === 1
          ? rejectedMessages[0]
          : `${rejectedMessages.length} files could not be added. ${rejectedMessages[0]}`
      );
    } else {
      setError(null);
    }

    if (acceptedFiles.length === 0) return;

    if (props.multiple) {
      props.onChange(mergeFiles(props.value, acceptedFiles));
    } else {
      props.onChange(acceptedFiles[0] ?? null);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    commitFiles(Array.from(e.dataTransfer.files));
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();

    if (!disabled) setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    commitFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleRemove(index: number) {
    setError(null);

    if (props.multiple) {
      props.onChange(props.value.filter((_, currentIndex) => currentIndex !== index));
    } else {
      props.onChange(null);
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {shouldShowDropZone && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            disabled
              ? 'cursor-not-allowed opacity-50'
              : isDragOver
                ? 'cursor-pointer border-primary bg-primary/5'
                : error
                  ? 'cursor-pointer border-destructive/50'
                  : 'cursor-pointer border-muted-foreground/25 hover:border-primary/50'
          )}
          aria-disabled={disabled}
        >
          <FileUp className={cn('size-10', isDragOver ? 'text-primary' : 'text-muted-foreground/50')} />
          <div>
            <p className="text-sm font-medium">
              {isDragOver
                ? isMultiple
                  ? 'Drop files here'
                  : 'Drop file here'
                : isMultiple
                  ? hasSelectedFiles
                    ? 'Drop more files here'
                    : 'Drag & drop files here'
                  : 'Drag & drop a file here'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={isMultiple}
            disabled={disabled}
            onChange={handleInputChange}
            data-testid={props.testId}
          />
        </div>
      )}

      {showSelectedPreview && hasSelectedFiles && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${getFileKey(file)}-${index}`}
              className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <FilePreview file={file} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatUploadFileSize(file.size)}
                  {file.type && ` · ${file.type}`}
                </p>
              </div>

              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                type="button"
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                onClick={() => handleRemove(index)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
