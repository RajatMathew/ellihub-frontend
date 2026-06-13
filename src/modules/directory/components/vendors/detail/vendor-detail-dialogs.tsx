import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';

interface VendorDetailDialogsProps {
  vendor: VendorDetail;
  open: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function VendorDetailDialogs({
  vendor,
  open,
  isDeleting,
  onOpenChange,
  onDelete,
}: VendorDetailDialogsProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Archive Vendor"
      description={
        <>
          This will archive <strong>{vendor.name}</strong>. Vendors linked to purchase orders, RFQs,
          or sub change orders cannot be archived.
        </>
      }
      confirmLabel="Archive"
      onConfirm={onDelete}
      variant="destructive"
      isPending={isDeleting}
    />
  );
}
