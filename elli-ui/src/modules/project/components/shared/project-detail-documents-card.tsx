import { Download, FileText, Trash2, Upload } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

export interface ProjectDetailDocumentRef {
  id: string;
  name?: string | null;
  displayName?: string | null;
}

export interface ProjectDetailDocumentItem {
  id: string;
  document?: ProjectDetailDocumentRef | null;
}

interface ProjectDetailDocumentsCardProps<TDocument extends ProjectDetailDocumentItem> {
  documents: TDocument[];
  canUpload: boolean;
  canRemove: boolean;
  onUpload: () => void;
  onDownload: (document: ProjectDetailDocumentRef) => void;
  onRemove: (document: TDocument) => void;
  getDescription?: (document: TDocument) => string | undefined;
  isRemoveDisabled?: (document: TDocument) => boolean;
  getRemoveDisabledReason?: (document: TDocument) => string | undefined;
  title?: string;
  emptyMessage?: string;
}

function getDocumentName(document?: ProjectDetailDocumentRef | null) {
  return document?.displayName ?? document?.name ?? 'Document';
}

export function ProjectDetailDocumentsCard<TDocument extends ProjectDetailDocumentItem>({
  documents,
  canUpload,
  canRemove,
  onUpload,
  onDownload,
  onRemove,
  getDescription,
  isRemoveDisabled,
  getRemoveDisabledReason,
  title = 'Documents',
  emptyMessage = 'No documents attached.',
}: ProjectDetailDocumentsCardProps<TDocument>) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          {title} ({documents.length})
        </CardTitle>
        {canUpload && (
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Upload className="size-4" />
            Upload
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((item) => {
              const document = item.document;
              const documentName = getDocumentName(document);
              const description = getDescription?.(item);
              const removeDisabled = isRemoveDisabled?.(item) ?? false;
              const removeDisabledReason = getRemoveDisabledReason?.(item);

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium">{documentName}</span>
                      {description && (
                        <span className="text-xs text-muted-foreground">{description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                    {document?.id && (
                      <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        aria-label={`Download ${documentName}`}
                        onClick={() => onDownload(document)}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    )}
                    {canRemove && (
                      <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        aria-label={`Remove ${documentName}`}
                        disabled={removeDisabled}
                        title={removeDisabled ? removeDisabledReason : undefined}
                        onClick={() => onRemove(item)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
