import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { FormPageToolbar } from '@/app/components/form-page-toolbar';

interface EmployeeFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillSample: () => void;
  className?: string;
}

export function EmployeeFormToolbar({
  isEdit,
  isSubmitting,
  onFillSample,
  className,
}: EmployeeFormToolbarProps) {
  return (
    <FormPageToolbar
      title={isEdit ? 'Update Profile' : 'Add New Employee'}
      submitLabel={isEdit ? 'Save Profile' : 'Create Employee'}
      isSubmitting={isSubmitting}
      extraActions={!isEdit ? <MockDataButton onClick={onFillSample} /> : undefined}
      className={className}
    />
  );
}
