import { Card, CardContent } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { formatDirectoryDate } from '@/modules/directory/components/shared';
import type { GCDocument } from '@/modules/directory/schemas/gc.schema';
import { FileText, ShieldCheck } from 'lucide-react';

interface GCDocumentsCardProps {
  documents: GCDocument[];
}

export function GCDocumentsCard({ documents }: GCDocumentsCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {documents.length > 0 ? (
          documents.map((document, index) => (
            <div key={document.id}>
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium text-foreground">
                    {document.file?.displayName || document.file?.name || document.fileId}
                  </div>
                  {document.expiresOn && (
                    <div className="text-xs text-muted-foreground">
                      Expires {formatDirectoryDate(document.expiresOn)}
                    </div>
                  )}
                </div>
              </div>
              {index < documents.length - 1 && <Separator className="mt-3" />}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No documents linked</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
