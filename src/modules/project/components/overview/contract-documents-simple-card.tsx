import { ArrowRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';

import type { ContractAttachment } from '@modules/project/schemas/contract-attachment.schema';

interface ContractDocumentsSimpleCardProps {
  projectId: string;
  documents: ContractAttachment[];
  isLoading?: boolean;
}

export function ContractDocumentsSimpleCard({
  projectId,
  documents,
  isLoading = false,
}: ContractDocumentsSimpleCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Contract Documents ({documents.length})
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" asChild>
          <Link to={`/app/project/${projectId}/contracts`}>
            Manage <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 rounded-lg border p-2.5"
              >
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">
                  {att.document?.name ?? 'Document'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No documents attached.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/project/${projectId}/contracts`}>
                Add Documents
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
