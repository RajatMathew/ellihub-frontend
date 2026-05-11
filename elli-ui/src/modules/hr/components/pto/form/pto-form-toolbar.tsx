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

interface PTOFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
}

export function PTOFormToolbar({ isEdit, isSubmitting }: PTOFormToolbarProps) {
  return (
    <Toolbar sticky={false}>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="../.." relative="path" className="hover:text-foreground">
              HR / Time Off
            </Link>
            {' / '}
            <span>{isEdit ? 'Update Request' : 'New Request'}</span>
          </div>
          <ToolbarPageTitle>{isEdit ? 'Modify Request' : 'Submit Time Off'}</ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update the details of this leave request.'
              : 'Enter the details for a new staff absence or leave request.'}
          </span>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" size="sm" type="button" asChild>
            <Link to=".." relative="path">
              Cancel
            </Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSubmitting}>
            <Check className="size-4" />
            {isEdit ? 'Save Changes' : 'Submit Request'}
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
