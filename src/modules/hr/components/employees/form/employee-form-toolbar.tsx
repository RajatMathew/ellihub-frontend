import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { isMockDataFillEnabled } from '@/app/lib/mock-data-fill';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillSample: () => void;
}

export function EmployeeFormToolbar({
  isEdit,
  isSubmitting,
  onFillSample,
}: EmployeeFormToolbarProps) {
  return (
    <Toolbar sticky={false}>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="../.." relative="path" className="hover:text-foreground">
              HR / Employees
            </Link>
            {' / '}
            <span>{isEdit ? 'Edit Profile' : 'New Induction'}</span>
          </div>
          <ToolbarPageTitle>{isEdit ? 'Update Profile' : 'Add New Employee'}</ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">
            {isEdit
              ? 'Modify personal details and employment configuration.'
              : 'Induct a staff member into workforce management.'}
          </span>
        </ToolbarHeading>
        <ToolbarActions>
          {isMockDataFillEnabled && !isEdit && (
            <Button variant="outline" size="sm" type="button" onClick={onFillSample}>
              Fill Sample
            </Button>
          )}
          <Button variant="outline" size="sm" type="button" asChild>
            <Link to=".." relative="path">
              Cancel
            </Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSubmitting}>
            <Check className="size-4" />
            {isEdit ? 'Save Profile' : 'Create Employee'}
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
