import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { FormPageToolbar } from '@/app/components/form-page-toolbar';
import { X } from 'lucide-react';

interface ContactFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillRandom: () => void;
  className?: string;
}

export function ContactFormToolbar({
  isEdit,
  isSubmitting,
  onFillRandom,
  className,
}: ContactFormToolbarProps) {
  return (
    <FormPageToolbar
      title={isEdit ? 'Edit Contact' : 'Add New Contact'}
      submitLabel={isEdit ? 'Save Changes' : 'Create Contact'}
      isSubmitting={isSubmitting}
      extraActions={<MockDataButton onClick={onFillRandom} />}
      cancelIcon={<X className="size-4" />}
      className={className}
    />
  );
}
