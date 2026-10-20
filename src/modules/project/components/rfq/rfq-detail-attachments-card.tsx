import { useState } from 'react';

import { FileFormatBadge } from '@/app/components/file-format-badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import type { RFQAttachment } from '@/modules/project/schemas/rfq';
import { FileText, Trash2, Upload } from 'lucide-react';

interface RFQDetailAttachmentsCardProps {
  attachments: RFQAttachment[];
  canUpload: boolean;
  canRemove: boolean;
  isRemoving: boolean;
  onUpload: () => void;
  onRemove: (attachmentId: string) => void;
}

export function RFQDetailAttachmentsCard({
  attachments,
  canUpload,
  canRemove,
  isRemoving,
  onUpload,
  onRemove,
}: RFQDetailAttachmentsCardProps) {
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="min-w-0 max-w-full break-words text-xs font-semibold uppercase tracking-normal text-muted-foreground [overflow-wrap:anywhere]">
          Attachments ({attachments.length})
        </CardTitle>
        {canUpload && (
          <Button
            variant="outline"
            size="sm"
            className="w-full min-w-0 justify-center sm:w-auto"
            onClick={onUpload}
          >
            <Upload className="size-4" />
            <span className="min-w-0 truncate">Add Attachment</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const document = attachment.document;
              const documentName = document?.name ?? 'File';

              return (
                <div
                  key={attachment.id}
                  className="flex min-w-0 max-w-full flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 max-w-full flex-1 items-center gap-3">
                    <FileFormatBadge fileName={documentName} className="size-6" />
                    <div className="min-w-0 flex-1">
                      {document?.id ? (
                        <button
                          type="button"
                          className="block w-full max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                          onClick={() => setPreviewFile({ ...document, name: documentName })}
                        >
                          {documentName}
                        </button>
                      ) : (
                        <div className="max-w-full truncate text-sm font-medium">
                          {documentName}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">Document</div>
                    </div>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      aria-label={`Remove ${documentName}`}
                      className="self-end sm:self-auto"
                      disabled={isRemoving}
                      onClick={() => onRemove(attachment.id)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No attachments.</p>
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
