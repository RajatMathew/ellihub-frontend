import type { ReactNode } from 'react';

import { FormSubmitButton } from '@/app/components/form-submit-button';
import { Button } from '@/app/components/ui/button';
import { Link } from 'react-router-dom';

import { PageHeader } from './page-header';
import type { ActionDef } from './page-header.types';

export interface FormPageHeaderProps {
  title: string;
  submitLabel: string;
  isSubmitting: boolean;
  /** Label of the record or list to return to. Omit for no back link. */
  backLabel?: string;
  /** Defaults to the parent path — where Cancel also goes. */
  backTo?: string;
  description?: ReactNode;
  /** Extra controls, e.g. a fill-with-mock-data button. */
  actions?: ActionDef[];
  cancelLabel?: string;
  cancelIcon?: ReactNode;
  className?: string;
}

/**
 * The header for a create or edit form.
 *
 * Not sticky: `FormPageShell` owns the sticky region so the section stepper can
 * sit inside it. Cancel and submit are rendered last and are not `ActionDef`s —
 * submit is a real `type="submit"` button wired to the surrounding form.
 */
export function FormPageHeader({
  title,
  submitLabel,
  isSubmitting,
  backLabel,
  backTo = '..',
  description,
  actions,
  cancelLabel = 'Cancel',
  cancelIcon,
  className,
}: FormPageHeaderProps) {
  return (
    <PageHeader
      actions={actions}
      className={className}
      description={
        description ? <span className="text-sm text-muted-foreground">{description}</span> : null
      }
      eyebrow={
        backLabel ? (
          <Link to={backTo} relative="path" className="transition-colors hover:text-foreground">
            {backLabel}
          </Link>
        ) : null
      }
      sticky={false}
      title={title}
      trailingActions={
        <>
          <Button variant="outline" size="sm" type="button" asChild>
            <Link to={backTo} relative="path">
              {cancelIcon}
              {cancelLabel}
            </Link>
          </Button>
          <FormSubmitButton isSubmitting={isSubmitting}>{submitLabel}</FormSubmitButton>
        </>
      }
    />
  );
}
