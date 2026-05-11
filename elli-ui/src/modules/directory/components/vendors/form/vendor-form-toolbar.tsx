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

interface VendorFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillRandom: () => void;
}

export function VendorFormToolbar({ isEdit, isSubmitting, onFillRandom }: VendorFormToolbarProps) {
  return (
    <Toolbar sticky={false}>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to=".." relative="path" className="hover:text-foreground">
              Directory
            </Link>
            {' / '}
            <span>{isEdit ? 'Edit' : 'New Vendor'}</span>
          </div>
          <ToolbarPageTitle>{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update vendor profile and contact information.'
              : 'Create a vendor profile with compliance and contact tracking.'}
          </span>
        </ToolbarHeading>
        <ToolbarActions>
          {!isEdit && (
            <Button variant="outline" size="sm" type="button" onClick={onFillRandom}>
              Fill Random
            </Button>
          )}
          <Button variant="outline" size="sm" type="button" asChild>
            <Link to=".." relative="path">
              Cancel
            </Link>
          </Button>
          <Button variant="outline" size="sm" type="submit" disabled={isSubmitting}>
            Save as Draft
          </Button>
          <Button size="sm" type="submit" disabled={isSubmitting}>
            <Check className="size-4" />
            {isEdit ? 'Save Changes' : 'Create Vendor'}
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
