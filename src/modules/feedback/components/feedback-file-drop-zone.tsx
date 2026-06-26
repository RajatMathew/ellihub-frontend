import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import { FileIconDisplay } from '@/app/components/ui/file-drop-zone';
import { cn } from '@/app/lib/utils';
import {
  FEEDBACK_FILE_ACCEPT,
  FEEDBACK_MAX_FILES,
  formatFeedbackFileSize,
  getFeedbackFileValidationError,
} from '@/modules/feedback/lib/feedback-file-validation';
import { AlertTriangle, FileUp, X } from 'lucide-react';

interface FeedbackFileDropZoneProps {
  value: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
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

export function FeedbackFileDropZone({
  value,
  onChange,
  disabled = false,
}: FeedbackFileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSelectedFiles = value.length > 0;

  function commitFiles(files: File[]) {
    if (files.length === 0) return;

    const acceptedFiles: File[] = [];
    const rejectedMessages: string[] = [];
    const availableSlots = Math.max(0, FEEDBACK_MAX_FILES - value.length);

    if (availableSlots === 0) {
      setError(`Attach up to ${FEEDBACK_MAX_FILES} files.`);
      return;
    }

    for (const file of files.slice(0, availableSlots)) {
      const validationError = getFeedbackFileValidationError(file);

      if (validationError) {
        rejectedMessages.push(`${file.name}: ${validationError}`);
      } else {
        acceptedFiles.push(file);
      }
    }

    if (files.length > availableSlots) {
      rejectedMessages.push(`Attach up to ${FEEDBACK_MAX_FILES} files.`);
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

    if (acceptedFiles.length > 0) {
      onChange(mergeFiles(value, acceptedFiles));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);

    if (!disabled) {
      commitFiles(Array.from(event.dataTransfer.files));
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    commitFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function handleRemove(index: number) {
    setError(null);
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-card p-8 text-center shadow-xs shadow-black/5 transition-[background-color,border-color,box-shadow]',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : isDragOver
              ? 'cursor-pointer border-primary bg-primary/5 shadow-sm shadow-primary/10'
              : error
                ? 'cursor-pointer border-destructive/50 bg-destructive/5'
                : 'cursor-pointer border-border hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/10'
        )}
        aria-disabled={disabled}
      >
        <div
          className={cn(
            'flex size-12 items-center justify-center rounded-md transition-colors',
            isDragOver ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <FileUp className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {isDragOver
              ? 'Drop files here'
              : hasSelectedFiles
                ? 'Drop more files here'
                : 'Drag & drop files here'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={FEEDBACK_FILE_ACCEPT}
          multiple
          disabled={disabled}
          onChange={handleInputChange}
        />
      </div>

      {hasSelectedFiles && (
        <div className="space-y-2">
          {value.map((file, index) => (
            <div
              key={`${getFileKey(file)}-${index}`}
              className="flex items-start gap-3 rounded-md border border-border bg-card p-3 shadow-xs shadow-black/5"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
                <FileIconDisplay file={file} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFeedbackFileSize(file.size)}
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
