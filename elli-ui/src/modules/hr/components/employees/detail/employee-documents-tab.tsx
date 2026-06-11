import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatDate } from '@/app/lib/helpers';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { Download, FileText, PlusCircle, Trash2 } from 'lucide-react';

type EmployeeDocument = Employee['documents'][number];
type EmployeeDocumentFile = NonNullable<EmployeeDocument['file']>;

interface EmployeeDocumentsTabProps {
  documents: EmployeeDocument[];
  isRemoving: boolean;
  isDownloading: boolean;
  onAddDocument: () => void;
  onDownloadDocument: (file: EmployeeDocumentFile) => void;
  onRemoveDocument: (fileId: string) => void;
}

export function EmployeeDocumentsTab({
  documents,
  isRemoving,
  isDownloading,
  onAddDocument,
  onDownloadDocument,
  onRemoveDocument,
}: EmployeeDocumentsTabProps) {
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Employee Documents
          </span>
          <Button size="xs" variant="primary" disabled={isRemoving} onClick={onAddDocument}>
            <PlusCircle className="size-3" />
            Add Document
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            {documents.map((document) => (
              <div
                key={document.id}
                className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded border bg-background">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    {document.file?.id ? (
                      <button
                        type="button"
                        className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                        onClick={() => setPreviewFile(document.file!)}
                      >
                        {getDocumentName(document)}
                      </button>
                    ) : (
                      <span className="block truncate text-sm font-medium">
                        {getDocumentName(document)}
                      </span>
                    )}
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {getDocumentMeta(document)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {document.file?.id && (
                    <Button
                      variant="ghost"
                      size="xs"
                      mode="icon"
                      disabled={isDownloading}
                      onClick={() => onDownloadDocument(document.file!)}
                      aria-label={`Download ${getDocumentName(document)}`}
                    >
                      <Download className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="xs"
                    mode="icon"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={isRemoving}
                    onClick={() => onRemoveDocument(document.fileId)}
                    aria-label={`Remove ${getDocumentName(document)}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              No documents linked yet.
            </p>
          </div>
        )}
      </CardContent>

      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
        file={previewFile}
      />
    </Card>
  );
}

function getDocumentName(document: EmployeeDocument) {
  return document.file?.displayName || document.file?.name || document.fileId;
}

function getDocumentMeta(document: EmployeeDocument) {
  const fileType = document.file?.mimeType || document.file?.type || 'Document';
  if (!document.expiresOn) return fileType;

  return `${fileType} - Expires ${formatDate(document.expiresOn, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}
