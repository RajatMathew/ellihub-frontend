import { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';

import { UploadFileDialog } from '@modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@modules/files/hooks/files.hooks';
import type { ContractAttachment } from '@modules/project/schemas/contract-attachment.schema';

interface ContractDocumentsCardProps {
  attachments: ContractAttachment[];
  isLoading: boolean;
  onAdd?: (fileId: string) => void;
  onRemove?: (attachmentId: string) => void;
  isAdding?: boolean;
  isRemoving?: boolean;
  parentFolderId?: string;
}

export function ContractDocumentsCard({
  attachments,
  isLoading,
  onAdd,
  onRemove,
  isAdding,
  isRemoving,
  parentFolderId,
}: ContractDocumentsCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

  const handleUploadSubmit = async (payload: { file: File; data: { name: string; parentId: string; mimeType?: string; size: number } }) => {
    const fileItem = await uploadMutation.mutateAsync(payload);
    onAdd?.(fileItem.id);
    setUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Contract Documents
        </CardTitle>
        <CardToolbar>
          <Button
            size="sm"
            variant="outline"
            disabled={!onAdd || !parentFolderId}
            onClick={() => setUploadOpen(true)}
          >
            + Add
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No contract documents attached.
          </p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border"
              >
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  {att.document?.id ? (
                    <button
                      type="button"
                      className="text-sm font-medium truncate text-primary hover:underline block max-w-full text-left"
                      onClick={() => downloadFile.mutate(att.document!)}
                    >
                      {att.document.name ?? 'Untitled Document'}
                    </button>
                  ) : (
                    <p className="text-sm font-medium truncate">
                      {att.document?.name ?? 'Untitled Document'}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">Document</span>
                {onRemove && (
                  <Button
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    onClick={() => onRemove(att.id)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {parentFolderId && (
        <UploadFileDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={parentFolderId}
          onSubmit={handleUploadSubmit}
          isSubmitting={uploadMutation.isPending || !!isAdding}
        />
      )}
    </Card>
  );
}
