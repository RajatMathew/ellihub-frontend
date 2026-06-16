import type { ReactNode } from 'react';

import { FormSubmitButton } from '@/app/components/form-submit-button';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Link } from 'react-router-dom';

interface FormPageToolbarProps {
  title: string;
  submitLabel: string;
  isSubmitting: boolean;
  backLabel?: string;
  description?: string;
  extraActions?: ReactNode;
  cancelIcon?: ReactNode;
  className?: string;
}

export function FormPageToolbar({
  title,
  submitLabel,
  isSubmitting,
  backLabel,
  description,
  extraActions,
  cancelIcon,
  className,
}: FormPageToolbarProps) {
  return (
    <Toolbar sticky={false} className={className}>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 gap-1 lg:gap-1">
          {backLabel ? (
            <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <Link to=".." relative="path" className="hover:text-foreground">
                {backLabel}
              </Link>
            </div>
          ) : null}
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
          {description ? (
            <span className="text-sm text-muted-foreground">{description}</span>
          ) : null}
        </ToolbarHeading>
        <ToolbarActions className="flex-wrap">
          {extraActions}
          <Button variant="outline" size="sm" type="button" asChild>
            <Link to=".." relative="path">
              {cancelIcon}
              Cancel
            </Link>
          </Button>
          <FormSubmitButton isSubmitting={isSubmitting}>{submitLabel}</FormSubmitButton>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
