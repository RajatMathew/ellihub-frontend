import type { FormEventHandler, ReactNode } from 'react';

import {
  unifiedFormHeaderClassName,
  unifiedFormNavClassName,
  unifiedFormPageClassName,
  unifiedFormToolbarClassName,
  unifiedFullHeightFormPageClassName,
  unifiedSingleSectionFormToolbarClassName,
} from '@/app/components/form-page-layout';
import { FormSectionNav } from '@/app/components/form-section-nav';
import { useStickyHeaderHeight } from '@/app/hooks/use-sticky-header-height';
import { cn } from '@/app/lib/utils';

interface FormPageShellProps {
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  renderToolbar: (className: string) => ReactNode;
  sections?: readonly { id: string; label: string }[];
  activeSection?: string;
  onSectionChange?: (id: string) => void;
  className?: string;
  formKey?: string;
  fullHeight?: boolean;
}

export function FormPageShell({
  children,
  onSubmit,
  renderToolbar,
  sections,
  activeSection,
  onSectionChange,
  className,
  formKey,
  fullHeight = false,
}: FormPageShellProps) {
  const { headerRef, headerHeight } = useStickyHeaderHeight<HTMLDivElement>();
  const hasSectionNav = Boolean(sections?.length && activeSection && onSectionChange);

  return (
    <form
      key={formKey}
      onSubmit={onSubmit}
      className={cn(
        fullHeight ? unifiedFullHeightFormPageClassName : unifiedFormPageClassName,
        className
      )}
    >
      <div ref={headerRef} className={unifiedFormHeaderClassName}>
        {renderToolbar(
          hasSectionNav ? unifiedFormToolbarClassName : unifiedSingleSectionFormToolbarClassName
        )}

        {hasSectionNav && (
          <FormSectionNav
            sections={sections!}
            activeSection={activeSection!}
            onSectionChange={onSectionChange!}
            scrollOffset={headerHeight}
            density="compact"
            appearance="stepper"
            className={unifiedFormNavClassName}
          />
        )}
      </div>

      {children}
    </form>
  );
}
