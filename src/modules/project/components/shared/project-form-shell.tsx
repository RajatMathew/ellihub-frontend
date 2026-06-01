import type { FormEventHandler, ReactNode } from 'react';

import {
  unifiedFormHeaderClassName,
  unifiedFormNavClassName,
  unifiedFormToolbarClassName,
  unifiedProjectFormPageClassName,
} from '@/app/components/form-page-layout';
import { FormSectionNav } from '@/app/components/form-section-nav';
import { useStickyHeaderHeight } from '@/app/hooks/use-sticky-header-height';

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
  const { headerRef, headerHeight } = useStickyHeaderHeight<HTMLDivElement>();

  return (
    <form key={formKey} onSubmit={onSubmit} className={unifiedProjectFormPageClassName}>
      <div ref={headerRef} className={unifiedFormHeaderClassName}>
        <ProjectFormToolbar
          title={title}
          submitLabel={submitLabel}
          isSubmitting={isSubmitting}
          className={unifiedFormToolbarClassName}
          extraActions={extraActions}
        />
        <FormSectionNav
          sections={sections}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          scrollOffset={headerHeight}
          density="compact"
          appearance="stepper"
          className={unifiedFormNavClassName}
        />
      </div>

      {children}
    </form>
  );
}
