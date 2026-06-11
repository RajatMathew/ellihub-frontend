import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { FormPageToolbar } from '@/app/components/form-page-toolbar';

interface VendorFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillRandom: () => void;
  className?: string;
}

export function VendorFormToolbar({
  isEdit,
  isSubmitting,
  onFillRandom,
  className,
}: VendorFormToolbarProps) {
  return (
    <FormPageToolbar
      title={isEdit ? 'Edit Vendor' : 'Add New Vendor'}
      submitLabel={isEdit ? 'Save Changes' : 'Create Vendor'}
      isSubmitting={isSubmitting}
      extraActions={!isEdit ? <MockDataButton onClick={onFillRandom} /> : undefined}
      className={className}
    />
  );
}
