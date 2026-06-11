import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { FormPageToolbar } from '@/app/components/form-page-toolbar';

interface GCFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillRandom: () => void;
  className?: string;
}

export function GCFormToolbar({
  isEdit,
  isSubmitting,
  onFillRandom,
  className,
}: GCFormToolbarProps) {
  return (
    <FormPageToolbar
      title={isEdit ? 'Edit General Contractor' : 'Add General Contractor'}
      submitLabel={isEdit ? 'Save Changes' : 'Create GC'}
      isSubmitting={isSubmitting}
      extraActions={<MockDataButton onClick={onFillRandom} />}
      className={className}
    />
  );
}
