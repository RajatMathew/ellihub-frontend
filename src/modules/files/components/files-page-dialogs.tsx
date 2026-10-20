import { CreateFolderDialog } from '@/modules/files/components/create-folder-dialog';
import { FilePreviewDialog } from '@/modules/files/components/file-preview-dialog';
import { FilesDeleteDialog } from '@/modules/files/components/files-delete-dialog';
import { RenameDialog } from '@/modules/files/components/rename-dialog';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import {
  useCreateFolderMutation,
  useDeleteFileMutation,
  useDeleteFolderMutation,
  useRenameMutation,
} from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import { toast } from 'sonner';

interface FilesPageDialogsProps {
  currentFolderId: string;
  createFolderOpen: boolean;
  uploadFileOpen: boolean;
  previewItem: FileItem | null;
  renameItem: FileItem | null;
  deleteItem: FileItem | null;
  onCreateFolderOpenChange: (open: boolean) => void;
  onUploadFileOpenChange: (open: boolean) => void;
  onPreviewItemChange: (item: FileItem | null) => void;
  onRenameItemChange: (item: FileItem | null) => void;
  onDeleteItemChange: (item: FileItem | null) => void;
  readOnly?: boolean;
  canCreateFolder?: boolean;
  canUpload?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function FilesPageDialogs({
  currentFolderId,
  createFolderOpen,
  uploadFileOpen,
  previewItem,
  renameItem,
  deleteItem,
  onCreateFolderOpenChange,
  onUploadFileOpenChange,
  onPreviewItemChange,
  onRenameItemChange,
  onDeleteItemChange,
  readOnly = false,
  canCreateFolder = !readOnly,
  canUpload = !readOnly,
  canUpdate = !readOnly,
  canDelete = !readOnly,
}: FilesPageDialogsProps) {
  const createFolderMutation = useCreateFolderMutation();
  const uploadManager = useUploadManager();
  const renameMutation = useRenameMutation();
  const deleteFolderMutation = useDeleteFolderMutation();
  const deleteFileMutation = useDeleteFileMutation();
  const isDeleting = deleteFolderMutation.isPending || deleteFileMutation.isPending;

  return (
    <>
      {canCreateFolder && (
        <CreateFolderDialog
          open={createFolderOpen}
          onOpenChange={onCreateFolderOpenChange}
          parentId={currentFolderId}
          isSubmitting={createFolderMutation.isPending}
          onSubmit={(data) => {
            createFolderMutation.mutate(data, {
              onSuccess: () => onCreateFolderOpenChange(false),
            });
          }}
        />
      )}
      {canUpload && (
        <UploadFileDialog
          open={uploadFileOpen}
          onOpenChange={onUploadFileOpenChange}
          parentId={currentFolderId}
          multiple
          isSubmitting={false}
          onSubmit={(payloads) => {
            uploadManager.enqueueUploads(payloads, { label: 'Files' });
            onUploadFileOpenChange(false);
          }}
        />
      )}
      {canUpdate && (
        <RenameDialog
          open={!!renameItem}
          onOpenChange={(open) => {
            if (!open) onRenameItemChange(null);
          }}
          item={renameItem}
          isSubmitting={renameMutation.isPending}
          onSubmit={(data) => {
            renameMutation.mutate(data, {
              onSuccess: () => {
                toast.success('Renamed successfully.');
                onRenameItemChange(null);
              },
            });
          }}
        />
      )}
      <FilePreviewDialog
        open={!!previewItem}
        onOpenChange={(open) => {
          if (!open) onPreviewItemChange(null);
        }}
        file={previewItem}
      />
      {canDelete && (
        <FilesDeleteDialog
          item={deleteItem}
          onOpenChange={(open) => {
            if (!open) onDeleteItemChange(null);
          }}
          isPending={isDeleting}
          onConfirm={() => {
            if (!deleteItem) return;

            const mutation =
              deleteItem.type === 'FOLDER' ? deleteFolderMutation : deleteFileMutation;
            mutation.mutate(deleteItem.id, {
              onSuccess: () => {
                toast.success(`${deleteItem.type === 'FOLDER' ? 'Folder' : 'File'} deleted.`);
                onDeleteItemChange(null);
              },
            });
          }}
        />
      )}
    </>
  );
}
