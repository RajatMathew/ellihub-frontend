/* eslint-disable react-hooks/set-state-in-effect -- reset() is a dialog lifecycle helper, not external synchronization */

import { useEffect, useMemo, useState } from 'react';

import { X } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { FileDropZone, FileIconDisplay } from '@/app/components/ui/file-drop-zone';
import { Input } from '@/app/components/ui/input';
import { Progress } from '@/app/components/ui/progress';
import type { FileUploadProgress } from '@/modules/files/api/files.api';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import {
  FILE_UPLOAD_ACCEPT,
  MAX_UPLOAD_BYTES,
  getUploadDisplayNameValidationError,
} from '@/modules/files/lib/file-upload-policy';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';

export interface UploadFilePayload {
  file: File;
  data: FileUploadInput;
}

interface UploadDraft {
  id: string;
  file: File;
  name: string;
}

interface UploadFileDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  isSubmitting: boolean;
  accept?: string;
  maxSize?: number;
  uploadProgress?: FileUploadProgress | null;
}

interface SingleUploadFileDialogProps extends UploadFileDialogBaseProps {
  multiple?: false;
  onSubmit: (payload: UploadFilePayload) => void;
}

interface MultipleUploadFileDialogProps extends UploadFileDialogBaseProps {
  multiple: true;
  onSubmit: (payloads: UploadFilePayload[]) => void;
}

type UploadFileDialogProps = SingleUploadFileDialogProps | MultipleUploadFileDialogProps;

function getFileBaseName(fileName: string): string {
  const dotIdx = fileName.lastIndexOf('.');

  return dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
}

function getFileExtensionLabel(fileName: string): string {
  const dotIdx = fileName.lastIndexOf('.');

  return dotIdx > 0 && dotIdx < fileName.length - 1 ? fileName.slice(dotIdx).toLowerCase() : 'file';
}

function getDraftFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function createDraft(file: File): UploadDraft {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `${getDraftFileKey(file)}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    name: getFileBaseName(file.name),
  };
}

function toUploadPayload(draft: UploadDraft, parentId: string): UploadFilePayload {
  const finalName = draft.name.trim();

  return {
    file: draft.file,
    data: {
      name: finalName,
      parentId,
      mimeType: draft.file.type || undefined,
      size: draft.file.size,
    },
  };
}

function getSelectionMessage(count: number, multiple: boolean): string {
  if (count > 0) {
    const fileLabel = count === 1 ? 'file' : 'files';

    return `${count} ${fileLabel} selected - rename before uploading`;
  }

  return multiple ? 'No files selected' : 'No file selected';
}

export function UploadFileDialog({
  open,
  onOpenChange,
  parentId,
  isSubmitting,
  uploadProgress,
  ...props
}: UploadFileDialogProps) {
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const isMultiple = props.multiple === true;
  const accept = props.accept ?? FILE_UPLOAD_ACCEPT;
  const maxSize = props.maxSize ?? MAX_UPLOAD_BYTES;
  const selectedFiles = useMemo(() => drafts.map((draft) => draft.file), [drafts]);
  const canUpload =
    drafts.length > 0 &&
    drafts.every((draft) => getUploadDisplayNameValidationError(draft.name, draft.file) === null) &&
    !isSubmitting;
  const progressValue =
    uploadProgress && uploadProgress.total > 0
      ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
      : 0;

  const reset = () => {
    setDrafts([]);
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && isSubmitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSingleFileChange = (file: File | null) => {
    setDrafts(file ? [createDraft(file)] : []);
  };

  const handleMultipleFilesChange = (files: File[]) => {
    setDrafts((currentDrafts) => {
      const currentByFile = new Map(
        currentDrafts.map((draft) => [getDraftFileKey(draft.file), draft])
      );

      return files.map((file) => currentByFile.get(getDraftFileKey(file)) ?? createDraft(file));
    });
  };

  const handleDraftNameChange = (draftId: string, name: string) => {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, name } : draft))
    );
  };

  const handleRemoveDraft = (draftId: string) => {
    setDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.id !== draftId));
  };

  const handleUpload = () => {
    if (!canUpload) return;

    const payloads = drafts.map((draft) => toUploadPayload(draft, parentId));

    if (props.multiple) {
      props.onSubmit(payloads);
      return;
    }

    const payload = payloads[0];

    if (payload) props.onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={isMultiple ? 'sm:max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle>{isMultiple ? 'Upload Files' : 'Upload File'}</DialogTitle>
          <DialogDescription>{getSelectionMessage(drafts.length, isMultiple)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isMultiple ? (
            <FileDropZone
              multiple
              value={selectedFiles}
              onChange={handleMultipleFilesChange}
              accept={accept}
              maxSize={maxSize}
              disabled={isSubmitting}
              showSelectedPreview={false}
            />
          ) : (
            <FileDropZone
              value={drafts[0]?.file ?? null}
              onChange={handleSingleFileChange}
              accept={accept}
              maxSize={maxSize}
              disabled={isSubmitting}
              showSelectedPreview={false}
            />
          )}

          {drafts.length > 0 && (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background">
                      <FileIconDisplay file={draft.file} className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Input
                        value={draft.name}
                        onChange={(event) => handleDraftNameChange(draft.id, event.target.value)}
                        placeholder="Document name"
                        aria-label={`Rename ${draft.file.name}`}
                        aria-invalid={
                          getUploadDisplayNameValidationError(draft.name, draft.file) !== null
                        }
                        disabled={isSubmitting}
                        className="font-medium"
                      />
                      {getUploadDisplayNameValidationError(draft.name, draft.file) && (
                        <p className="text-xs text-destructive">
                          {getUploadDisplayNameValidationError(draft.name, draft.file)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:shrink-0">
                    <span className="text-xs text-muted-foreground sm:min-w-28 sm:text-right">
                      {getFileExtensionLabel(draft.file.name)} - {formatFileSize(draft.file.size)}
                    </span>
                    <Button
                      variant="outline"
                      mode="icon"
                      size="sm"
                      type="button"
                      disabled={isSubmitting}
                      aria-label={`Remove ${draft.file.name}`}
                      onClick={() => handleRemoveDraft(draft.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isMultiple && isSubmitting && uploadProgress && uploadProgress.total > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium">
                  {uploadProgress.currentFileName
                    ? `Uploading ${uploadProgress.currentFileName}`
                    : 'Uploading files'}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {uploadProgress.completed}/{uploadProgress.total}
                </span>
              </div>
              <Progress value={progressValue} aria-label="Upload progress" />
            </div>
          )}
        </div>

        <DialogFooter className="items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <p className="text-sm font-medium text-muted-foreground">
            {drafts.length > 0
              ? `${drafts.length} ${drafts.length === 1 ? 'file' : 'files'} ready`
              : 'No file selected'}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {isMultiple && drafts.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                disabled={isSubmitting}
              >
                Clear all
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!canUpload}>
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
