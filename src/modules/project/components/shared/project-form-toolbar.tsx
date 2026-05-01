import type { ReactNode } from 'react';

import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';

interface ProjectFormToolbarProps {
  backLabel: string;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  extraActions?: ReactNode;
}

export function ProjectFormToolbar({
  backLabel,
  title,
  description,
  submitLabel,
  isSubmitting,
  extraActions,
}: ProjectFormToolbarProps) {
  return (
    <Toolbar sticky={false}>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            <Link to=".." relative="path" className="hover:text-foreground">
              {backLabel}
            </Link>
          </div>
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">{description}</span>
        </ToolbarHeading>
        <ToolbarActions>
          {extraActions}
          <Button variant="outline" size="sm" type="button" asChild>
            <Link to=".." relative="path">
              Cancel
            </Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSubmitting}>
            <Check className="size-4" />
            {submitLabel}
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
