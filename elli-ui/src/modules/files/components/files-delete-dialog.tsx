import { ResourceDeleteDialog } from '@/app/components/resource-delete-dialog';
import type { FileItem } from '@/modules/files/schemas/file.schema';

interface FilesDeleteDialogProps {
  item: FileItem | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function FilesDeleteDialog({
  item,
  isPending,
  onOpenChange,
  onConfirm,
}: FilesDeleteDialogProps) {
  const label = item?.type === 'FOLDER' ? 'folder' : 'file';

  return (
    <ResourceDeleteDialog
      open={!!item}
      onOpenChange={onOpenChange}
      title={`Delete ${label}`}
      confirmLabel="Delete"
      isPending={isPending}
      onConfirm={onConfirm}
    >
      Are you sure you want to delete <strong>{item?.displayName || item?.name}</strong>? This
      action cannot be undone.
    </ResourceDeleteDialog>
  );
}
