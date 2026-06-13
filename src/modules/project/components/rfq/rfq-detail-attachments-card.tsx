import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import type { RFQAttachment } from '@/modules/project/schemas/rfq';
import { FileText, Paperclip, Trash2, Upload } from 'lucide-react';

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
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Attachments ({attachments.length})
        </CardTitle>
        {canUpload && (
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Upload className="size-4" />
            Add Attachment
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
                  className="flex min-w-0 flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      {document?.id ? (
                        <button
                          type="button"
                          className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                          onClick={() => setPreviewFile({ ...document, name: documentName })}
                        >
                          {documentName}
                        </button>
                      ) : (
                        <div className="truncate text-sm font-medium">{documentName}</div>
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
