import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { FormPageToolbar } from '@/app/components/form-page-toolbar';

interface DepartmentFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillSample: () => void;
  className?: string;
}

export function DepartmentFormToolbar({
  isEdit,
  isSubmitting,
  onFillSample,
  className,
}: DepartmentFormToolbarProps) {
  return (
    <FormPageToolbar
      title={isEdit ? 'Edit Department' : 'Create Department'}
      submitLabel={isEdit ? 'Save Changes' : 'Create Department'}
      isSubmitting={isSubmitting}
      extraActions={!isEdit ? <MockDataButton onClick={onFillSample} /> : undefined}
      className={className}
    />
  );
}
