import { useMemo, useState } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useUploadFileMutation } from '@/modules/files/hooks/files.hooks';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import type { ContractAttachment } from '@/modules/project/schemas/contract-attachment.schema';
import { FileText, Pin, PinOff, Star, StarOff, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface ContractDocumentsSimpleCardProps {
  documents: ContractAttachment[];
  isLoading?: boolean;
  isAdding?: boolean;
  isRemoving?: boolean;
  documentsUrl?: string;
  parentFolderId?: string;
  onUploadAndPin?: (fileId: string) => Promise<void> | void;
  onPinClick?: () => void;
  onUnpin?: (attachmentId: string) => void;
  onSetPrimary?: (attachmentId: string, isPrimary: boolean) => void;
  isSettingPrimary?: boolean;
}

export function ContractDocumentsSimpleCard({
  documents,
  isLoading = false,
  isAdding = false,
  isRemoving = false,
  documentsUrl,
  parentFolderId,
  onUploadAndPin,
  onPinClick,
  onUnpin,
  onSetPrimary,
  isSettingPrimary = false,
}: ContractDocumentsSimpleCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);
  const uploadMutation = useUploadFileMutation();
  const sortedDocuments = useMemo(
    () =>
      [...documents].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime();
      }),
    [documents]
  );

  const handleUploadSubmit = async (payload: { file: File; data: FileUploadInput }) => {
    const fileItem = await uploadMutation.mutateAsync(payload);
    await onUploadAndPin?.(fileItem.id);
    setUploadOpen(false);
  };

  const handlePreviewDocument = (file: FilePreviewItem) => {
    if (file.deletedAt) {
      toast.error('This file no longer exists or has been deleted.');
      return;
    }

    setPreviewFile(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        {documentsUrl ? (
          <CardTitle className="text-xs font-semibold tracking-widest uppercase">
            <Link to={documentsUrl} className="hover:underline">
              Contract Documents ({documents.length})
            </Link>
          </CardTitle>
        ) : (
          <CardTitle className="text-xs font-semibold tracking-widest uppercase">
            Contract Documents ({documents.length})
          </CardTitle>
        )}
        {(onUploadAndPin || onPinClick) && (
          <CardToolbar>
            <div className="flex items-center gap-2">
              {onUploadAndPin && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!parentFolderId || isAdding || uploadMutation.isPending}
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="size-4" />
                  Upload
                </Button>
              )}
              {onPinClick && (
                <Button size="sm" variant="outline" onClick={onPinClick}>
                  <Pin className="size-4" />
                  Pin
                </Button>
              )}
            </div>
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
                  <FileTypeIcon
                    fileType={document?.type ?? 'FILE'}
                    mimeType={document?.mimeType}
                    fileName={documentName}
                    className="size-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    {document?.id ? (
                      <button
                        type="button"
                        className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                        aria-label={`Open preview for ${documentName}`}
                        title={
                          document?.deletedAt
                            ? 'This file no longer exists or has been deleted.'
                            : 'Open preview'
                        }
                        onClick={() => handlePreviewDocument(document)}
                      >
                        {documentName}
                      </button>
                    ) : (
                      <span className="block truncate text-sm font-medium">{documentName}</span>
                    )}
                  </div>
                  {isPrimary && (
                    <Badge variant="primary" appearance="light" size="sm" className="shrink-0">
                      Primary
                    </Badge>
                  )}
                  {onSetPrimary && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="sm"
                          disabled={isSettingPrimary}
                          aria-label={
                            isPrimary
                              ? `Remove primary mark from ${documentName}`
                              : `Mark ${documentName} primary`
                          }
                          onClick={() => onSetPrimary(att.id, !isPrimary)}
                        >
                          {isPrimary ? <StarOff className="size-4" /> : <Star className="size-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPrimary ? 'Remove primary mark' : 'Mark primary'}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {onUnpin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="sm"
                          disabled={isRemoving}
                          aria-label={`Unpin ${documentName}`}
                          onClick={() => onUnpin(att.id)}
                        >
                          <PinOff className="size-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Unpin from overview</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No prime contracts pinned.</p>
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
