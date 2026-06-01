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
  className?: string;
}

export function EmployeeFormToolbar({
  isEdit,
  isSubmitting,
  onFillSample,
  className,
}: EmployeeFormToolbarProps) {
  return (
    <Toolbar sticky={false} className={className}>
      <ToolbarWrapper>
        <ToolbarHeading className="gap-1 lg:gap-1">
          <ToolbarPageTitle>{isEdit ? 'Update Profile' : 'Add New Employee'}</ToolbarPageTitle>
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
