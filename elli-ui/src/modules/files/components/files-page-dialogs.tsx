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
  useUploadFileMutation,
} from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';
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
}: FilesPageDialogsProps) {
  const createFolderMutation = useCreateFolderMutation();
  const uploadFileMutation = useUploadFileMutation();
  const renameMutation = useRenameMutation();
  const deleteFolderMutation = useDeleteFolderMutation();
  const deleteFileMutation = useDeleteFileMutation();
  const isDeleting = deleteFolderMutation.isPending || deleteFileMutation.isPending;

  return (
    <>
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
      <UploadFileDialog
        open={uploadFileOpen}
        onOpenChange={onUploadFileOpenChange}
        parentId={currentFolderId}
        isSubmitting={uploadFileMutation.isPending}
        onSubmit={(payload) => {
          uploadFileMutation.mutate(payload, {
            onSuccess: () => onUploadFileOpenChange(false),
          });
        }}
      />
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
      <FilePreviewDialog
        open={!!previewItem}
        onOpenChange={(open) => {
          if (!open) onPreviewItemChange(null);
        }}
        file={previewItem}
      />
      <FilesDeleteDialog
        item={deleteItem}
        onOpenChange={(open) => {
          if (!open) onDeleteItemChange(null);
        }}
        isPending={isDeleting}
        onConfirm={() => {
          if (!deleteItem) return;

          const mutation = deleteItem.type === 'FOLDER' ? deleteFolderMutation : deleteFileMutation;
          mutation.mutate(deleteItem.id, {
            onSuccess: () => {
              toast.success(`${deleteItem.type === 'FOLDER' ? 'Folder' : 'File'} deleted.`);
              onDeleteItemChange(null);
            },
          });
        }}
      />
    </>
  );
}
