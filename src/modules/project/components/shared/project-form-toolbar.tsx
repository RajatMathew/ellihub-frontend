import type { ReactNode } from 'react';

import { FormPageToolbar } from '@/app/components/form-page-toolbar';

interface ProjectFormToolbarProps {
  backLabel?: string;
  title: string;
  description?: string;
  submitLabel: string;
  isSubmitting: boolean;
  extraActions?: ReactNode;
  className?: string;
}

export function ProjectFormToolbar({
  backLabel,
  title,
  description,
  submitLabel,
  isSubmitting,
  extraActions,
  className,
}: ProjectFormToolbarProps) {
  return (
    <FormPageToolbar
      backLabel={backLabel}
      title={title}
      description={description}
      submitLabel={submitLabel}
      isSubmitting={isSubmitting}
      extraActions={extraActions}
      className={className}
    />
  );
}
