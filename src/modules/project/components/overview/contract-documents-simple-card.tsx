import { useState } from 'react';

import { FileText, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@/app/components/ui/card';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@/modules/files/hooks/files.hooks';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';

import type { ContractAttachment } from '@/modules/project/schemas/contract-attachment.schema';

interface ContractDocumentsSimpleCardProps {
  documents: ContractAttachment[];
  isLoading?: boolean;
  isAdding?: boolean;
  isRemoving?: boolean;
  parentFolderId?: string;
  onAdd?: (fileId: string) => Promise<void> | void;
  onRemove?: (attachmentId: string) => void;
}

export function ContractDocumentsSimpleCard({
  documents,
  isLoading = false,
  isAdding = false,
  isRemoving = false,
  parentFolderId,
  onAdd,
  onRemove,
}: ContractDocumentsSimpleCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

  const handleUploadSubmit = async (payload: { file: File; data: FileUploadInput }) => {
    const fileItem = await uploadMutation.mutateAsync(payload);
    await onAdd?.(fileItem.id);
    setUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Contract Documents ({documents.length})
        </CardTitle>
        <CardToolbar>
          <Button
            size="sm"
            variant="outline"
            disabled={!onAdd || !parentFolderId || isAdding || uploadMutation.isPending}
            onClick={() => setUploadOpen(true)}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </CardToolbar>
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
              <div key={att.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  {att.document?.id ? (
                    <button
                      type="button"
                      className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                      onClick={() => downloadFile.mutate(att.document!)}
                    >
                      {att.document.name ?? 'Document'}
                    </button>
                  ) : (
                    <span className="block truncate text-sm font-medium">
                      {att.document?.name ?? 'Document'}
                    </span>
                  )}
                </div>
                {onRemove && (
                  <Button
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    disabled={isRemoving}
                    aria-label={`Remove ${att.document?.name ?? 'document'}`}
                    onClick={() => onRemove(att.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No documents attached.
            </p>
          </div>
        )}
      </CardContent>

      {parentFolderId && (
        <UploadFileDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={parentFolderId}
          onSubmit={(payload) => void handleUploadSubmit(payload)}
          isSubmitting={uploadMutation.isPending || isAdding}
        />
      )}
    </Card>
  );
}
