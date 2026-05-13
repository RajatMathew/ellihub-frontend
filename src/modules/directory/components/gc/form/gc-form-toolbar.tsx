import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GCFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillRandom: () => void;
}

export function GCFormToolbar({ isEdit, isSubmitting, onFillRandom }: GCFormToolbarProps) {
  return (
    <Toolbar sticky={false}>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to=".." relative="path" className="hover:text-foreground">
              General Contractors
            </Link>
            {' / '}
            <span>{isEdit ? 'Edit' : 'New GC'}</span>
          </div>
          <ToolbarPageTitle>
            {isEdit ? 'Edit General Contractor' : 'Add General Contractor'}
          </ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update the general contractor information below.'
              : 'Register a General Contractor to track projects and compliance.'}
          </span>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" size="sm" type="button" onClick={onFillRandom}>
            Fill Random
          </Button>
          <Button variant="outline" size="sm" type="button" asChild>
            <Link to=".." relative="path">
              Cancel
            </Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSubmitting}>
            <Check className="size-4" />
            {isEdit ? 'Save Changes' : 'Create GC'}
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
