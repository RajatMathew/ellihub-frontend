import { useMemo, useState } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@/modules/files/hooks/files.hooks';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import type { ContractAttachment } from '@/modules/project/schemas/contract-attachment.schema';
import { FileText, Plus, Star, Trash2 } from 'lucide-react';

interface ContractDocumentsSimpleCardProps {
  documents: ContractAttachment[];
  isLoading?: boolean;
  isAdding?: boolean;
  isRemoving?: boolean;
  isSettingPrimary?: boolean;
  parentFolderId?: string;
  onAdd?: (fileId: string) => Promise<void> | void;
  onSetPrimary?: (attachmentId: string) => void;
  onRemove?: (attachmentId: string) => void;
}

export function ContractDocumentsSimpleCard({
  documents,
  isLoading = false,
  isAdding = false,
  isRemoving = false,
  isSettingPrimary = false,
  parentFolderId,
  onAdd,
  onSetPrimary,
  onRemove,
}: ContractDocumentsSimpleCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();
  const sortedDocuments = useMemo(
    () =>
      [...documents].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime();
      }),
    [documents]
  );
  const canRemoveDocuments = sortedDocuments.length > 1;

  const handleUploadSubmit = async (payload: { file: File; data: FileUploadInput }) => {
    const fileItem = await uploadMutation.mutateAsync(payload);
    await onAdd?.(fileItem.id);
    setUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Contract Documents (Prime Contracts) ({documents.length})
        </CardTitle>
        {onAdd && (
          <CardToolbar>
            <Button
              size="sm"
              variant="outline"
              disabled={!parentFolderId || isAdding || uploadMutation.isPending}
              onClick={() => setUploadOpen(true)}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </CardToolbar>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ProjectInlineListLoading rows={2} />
        ) : sortedDocuments.length > 0 ? (
          <div className="space-y-2">
            {sortedDocuments.map((att) => {
              const document = att.file ?? att.document;
              const documentName = document?.displayName ?? document?.name ?? 'Document';
              const isPrimary = att.isPrimary ?? false;

              return (
                <div key={att.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    {document?.id ? (
                      <button
                        type="button"
                        className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                        onClick={() => downloadFile.mutate(document)}
                      >
                        {documentName}
                      </button>
                    ) : (
                      <span className="block truncate text-sm font-medium">{documentName}</span>
                    )}
                  </div>
                  {isPrimary ? (
                    <Badge variant="primary" appearance="light" size="sm" className="shrink-0">
                      Primary
                    </Badge>
                  ) : (
                    onSetPrimary && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            disabled={isSettingPrimary}
                            aria-label={`Make ${documentName} primary`}
                            onClick={() => onSetPrimary(att.id)}
                          >
                            <Star className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Make primary</TooltipContent>
                      </Tooltip>
                    )
                  )}
                  {onRemove && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            disabled={isRemoving || !canRemoveDocuments}
                            aria-label={`Remove ${documentName}`}
                            onClick={() => {
                              if (canRemoveDocuments) onRemove(att.id);
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {canRemoveDocuments
                          ? 'Remove from overview'
                          : 'At least one prime contract is required'}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No prime contracts attached.</p>
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
