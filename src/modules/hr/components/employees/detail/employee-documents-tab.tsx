import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { FileText, PlusCircle, Trash2 } from 'lucide-react';

type EmployeeDocument = Employee['documents'][number];

interface EmployeeDocumentsTabProps {
  documents: EmployeeDocument[];
  isRemoving: boolean;
  onAddDocument: () => void;
  onRemoveDocument: (fileId: string) => void;
}

export function EmployeeDocumentsTab({
  documents,
  isRemoving,
  onAddDocument,
  onRemoveDocument,
}: EmployeeDocumentsTabProps) {
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    <span className="block truncate text-sm font-medium">{document.name}</span>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {document.type || 'Document'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  mode="icon"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={isRemoving}
                  onClick={() => onRemoveDocument(document.id)}
                  aria-label={`Remove ${document.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
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
    </Card>
  );
}
