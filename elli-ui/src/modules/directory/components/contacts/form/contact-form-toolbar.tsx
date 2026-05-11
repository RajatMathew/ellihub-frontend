import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Check, Shuffle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContactFormToolbarProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onFillRandom: () => void;
}

export function ContactFormToolbar({
  isEdit,
  isSubmitting,
  onFillRandom,
}: ContactFormToolbarProps) {
  return (
    <Toolbar sticky={false}>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="/app/directory/contacts" className="hover:text-foreground">
              Directory
            </Link>
            {' / '}
            <Link to="/app/directory/contacts" className="hover:text-foreground">
              Contacts
            </Link>
          </div>
          <ToolbarPageTitle>{isEdit ? 'Edit Contact' : 'Add New Contact'}</ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update the contact information below.'
              : 'Register a new individual and associate them with a company.'}
          </span>
        </ToolbarHeading>

        <ToolbarActions>
          <Button variant="outline" size="sm" type="button" onClick={onFillRandom}>
            <Shuffle className="size-4" />
            Fill Random
          </Button>
          <Button variant="outline" size="sm" type="button" asChild>
            <Link to=".." relative="path">
              <X className="size-4" />
              Cancel
            </Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSubmitting}>
            <Check className="size-4" />
            {isEdit ? 'Save Changes' : 'Create Contact'}
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
