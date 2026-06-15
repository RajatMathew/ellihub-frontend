import { FormPageToolbar } from '@/app/components/form-page-toolbar';

interface PTOFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  className?: string;
}

export function PTOFormToolbar({ isEdit, isSubmitting, className }: PTOFormToolbarProps) {
  return (
    <FormPageToolbar
      title={isEdit ? 'Modify Request' : 'Submit Time Off'}
      submitLabel={isEdit ? 'Save Changes' : 'Submit Request'}
      isSubmitting={isSubmitting}
      className={className}
    />
  );
}
