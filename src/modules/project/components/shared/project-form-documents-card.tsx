import type { ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { FileDropZone } from '@/app/components/ui/file-drop-zone';
import { FileText, Loader2, X } from 'lucide-react';

interface ExistingProjectDocument {
  id: string;
  document?: unknown;
}

interface ProjectFormDocumentsCardProps {
  selectedFiles: File[];
  existingDocuments?: ExistingProjectDocument[];
  onAddFile: (file: File) => void;
  onRemoveFile: (index: number) => void;
  onRemoveExistingDocument?: (document: ExistingProjectDocument) => void;
  isRemovingExistingDocument?: (document: ExistingProjectDocument) => boolean;
  getExistingDocumentRemoveDisabled?: (document: ExistingProjectDocument) => boolean;
  disabled?: boolean;
  title?: string;
  existingTitle?: string;
  fileInputTestId?: string;
  children?: ReactNode;
}

function fileSizeLabel(size: number) {
  return `${(size / 1024).toFixed(1)} KB`;
}

function getDocumentName(document: unknown) {
  if (!document || typeof document !== 'object') return 'Document';
  const value = document as { name?: unknown };
  return typeof value.name === 'string' && value.name ? value.name : 'Document';
}

export function ProjectFormDocumentsCard({
  selectedFiles,
  existingDocuments = [],
  onAddFile,
  onRemoveFile,
  onRemoveExistingDocument,
  isRemovingExistingDocument,
  getExistingDocumentRemoveDisabled,
  disabled = false,
  title = 'Documents',
  existingTitle = 'Existing Documents',
  fileInputTestId,
  children,
}: ProjectFormDocumentsCardProps) {
  return (
    <Card id="documents">
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children && <div className="mb-4">{children}</div>}

        <FileDropZone
          value={null}
          onChange={(file) => {
            if (file) onAddFile(file);
          }}
          disabled={disabled}
          testId={fileInputTestId}
        />

        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {fileSizeLabel(file.size)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  className="self-end sm:self-auto"
                  onClick={() => onRemoveFile(index)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {existingDocuments.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              {existingTitle}
            </div>
            {existingDocuments.map((attachment) => {
              const documentName = getDocumentName(attachment.document);
              const isRemoving = isRemovingExistingDocument?.(attachment) ?? false;
              const canRemove = !!onRemoveExistingDocument && !disabled;
              const removeDisabled =
                isRemoving || getExistingDocumentRemoveDisabled?.(attachment) === true;

              return (
                <div
                  key={attachment.id}
                  className="flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{documentName}</span>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      type="button"
                      aria-label={`Remove ${documentName}`}
                      className="self-end sm:self-auto"
                      disabled={removeDisabled}
                      onClick={() => onRemoveExistingDocument(attachment)}
                    >
                      {isRemoving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
