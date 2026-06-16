import type { FormEventHandler, ReactNode } from 'react';

import { FormPageShell } from '@/app/components/form-page-shell';

import { ProjectFormToolbar } from './project-form-toolbar';

interface ProjectFormShellProps {
  children: ReactNode;
  title: string;
  submitLabel: string;
  isSubmitting: boolean;
  sections: readonly { id: string; label: string }[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  extraActions?: ReactNode;
  formKey?: string;
}

export function ProjectFormShell({
  children,
  title,
  submitLabel,
  isSubmitting,
  sections,
  activeSection,
  onSectionChange,
  onSubmit,
  extraActions,
  formKey,
}: ProjectFormShellProps) {
  return (
    <FormPageShell
      formKey={formKey}
      onSubmit={onSubmit}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={onSectionChange}
      className="min-h-[calc(100dvh-5rem)]"
      renderToolbar={(className) => (
        <ProjectFormToolbar
          title={title}
          submitLabel={submitLabel}
          isSubmitting={isSubmitting}
          className={className}
          extraActions={extraActions}
        />
      )}
    >
      {children}
    </FormPageShell>
  );
}
