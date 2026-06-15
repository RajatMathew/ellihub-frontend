import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { GeneralContractorDetail } from '@/modules/directory/schemas/gc.schema';

interface GCDetailDialogsProps {
  gc: GeneralContractorDetail;
  open: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function GCDetailDialogs({
  gc,
  open,
  isDeleting,
  onOpenChange,
  onDelete,
}: GCDetailDialogsProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Archive General Contractor"
      description={
        <>
          This will set <strong>{gc.name}</strong> to inactive. Projects that reference this GC will
          keep their association. Are you sure?
        </>
      }
      confirmLabel="Archive"
      onConfirm={onDelete}
      variant="destructive"
      isPending={isDeleting}
    />
  );
}
