import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';
import { useUploadManager } from '@/modules/files/uploads/upload-manager';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import type { ProjectMasterSchedule } from '@/modules/project/schemas/project-master-schedule.schema';
import { FileText, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface MasterScheduleCardProps {
  masterSchedule?: ProjectMasterSchedule | null;
  isLoading?: boolean;
  parentFolderId?: string;
  folderUrl?: string;
  canManage?: boolean;
  onUploadAndSet?: (fileId: string) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  isSaving?: boolean;
  isRemoving?: boolean;
}

function getMasterScheduleName(masterSchedule: ProjectMasterSchedule): string {
  return (
    masterSchedule.file?.displayName ||
    masterSchedule.file?.name ||
    masterSchedule.displayName ||
    masterSchedule.fileName ||
    'Master schedule'
  );
}

function formatUploadedAt(value: string | null | undefined): string {
  if (!value) return 'Uploaded date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Uploaded date unavailable';

  return `Uploaded ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export function MasterScheduleCard({
  masterSchedule,
  isLoading = false,
  parentFolderId,
  folderUrl,
  canManage = false,
  onUploadAndSet,
  onRemove,
  isSaving = false,
  isRemoving = false,
}: MasterScheduleCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);
  const uploadManager = useUploadManager();
  const file = masterSchedule?.file ?? null;
  const documentName = masterSchedule ? getMasterScheduleName(masterSchedule) : 'Master schedule';
  const canUpload = canManage && !!parentFolderId && !!onUploadAndSet;
  const canRemove = canManage && !!masterSchedule && !!onRemove;

  const handleUploadSubmit = (payload: { file: File; data: FileUploadInput }) => {
    uploadManager.enqueueUploads([payload], {
      label: 'Master schedule',
      onUploaded: async (uploaded) => {
        await onUploadAndSet?.(uploaded.id);
      },
    });
    setUploadOpen(false);
  };

  const handlePreview = () => {
    if (!file) return;
    if (file.deletedAt) {
      toast.error('This file no longer exists or has been deleted.');
      return;
    }

    setPreviewFile(file);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-4 py-2.5">
          <CardTitle className="text-xs font-semibold tracking-[0.18em] uppercase">
            {folderUrl ? (
              <Link to={folderUrl} className="hover:underline">
                Master Schedule
              </Link>
            ) : (
              'Master Schedule'
            )}
          </CardTitle>
          {canManage && (
            <CardToolbar>
              <div className="flex items-center gap-2">
                {canUpload && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSaving || isRemoving}
                    onClick={() => setUploadOpen(true)}
                  >
                    {masterSchedule ? (
                      <RefreshCw className="size-4" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {masterSchedule ? 'Replace' : 'Upload'}
                  </Button>
                )}
                {canRemove && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSaving || isRemoving}
                    onClick={() => setRemoveOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                )}
              </div>
            </CardToolbar>
          )}
        </CardHeader>

        <CardContent className="px-3 py-2">
          {isLoading ? (
            <ProjectInlineListLoading rows={1} />
          ) : masterSchedule ? (
            <div className="group flex min-w-0 items-center gap-3 rounded-lg border bg-card/60 px-3 py-3 transition-colors hover:bg-muted/10">
              <FileTypeIcon
                fileType={file?.type ?? 'FILE'}
                mimeType={file?.mimeType ?? masterSchedule.mimeType}
                fileName={file?.name ?? documentName}
                className="size-[1.375rem] shrink-0 stroke-[2.1]"
              />
              <div className="min-w-0 flex-1">
                {file?.id ? (
                  <button
                    type="button"
                    className="block min-w-0 truncate text-left text-[15px] leading-6 font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                    aria-label={`Open preview for ${documentName}`}
                    onClick={handlePreview}
                  >
                    {documentName}
                  </button>
                ) : (
                  <span className="block min-w-0 truncate text-[15px] leading-6 font-semibold text-foreground">
                    {documentName}
                  </span>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatFileSize(file?.size ?? masterSchedule.size)}</span>
                  <span>{formatUploadedAt(masterSchedule.uploadedAt)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <FileText className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No master schedule uploaded.</p>
            </div>
          )}
        </CardContent>

        {parentFolderId && (
          <UploadFileDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            parentId={parentFolderId}
            onSubmit={(payload) => void handleUploadSubmit(payload)}
            isSubmitting={isSaving}
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

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove Master Schedule"
        description={
          <>
            Remove <strong>{documentName}</strong> from this project overview? The file will remain
            in Project Files.
          </>
        }
        confirmLabel="Remove"
        onConfirm={async () => {
          await onRemove?.();
          setRemoveOpen(false);
        }}
        variant="destructive"
        isPending={isRemoving}
      />
    </>
  );
}
