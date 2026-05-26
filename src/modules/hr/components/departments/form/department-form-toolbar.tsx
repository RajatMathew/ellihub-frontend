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

interface DepartmentFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillSample: () => void;
}

export function DepartmentFormToolbar({
  isEdit,
  isSubmitting,
  onFillSample,
}: DepartmentFormToolbarProps) {
  return (
    <Toolbar sticky={false}>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="../.." relative="path" className="hover:text-foreground">
              Departments
            </Link>
            {' / '}
            <span>{isEdit ? 'Edit' : 'New Department'}</span>
          </div>
          <ToolbarPageTitle>{isEdit ? 'Edit Department' : 'Create Department'}</ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update basic information and settings for this department.'
              : 'Define a new department to organize your company structure.'}
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
            {isEdit ? 'Save Changes' : 'Create Department'}
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
