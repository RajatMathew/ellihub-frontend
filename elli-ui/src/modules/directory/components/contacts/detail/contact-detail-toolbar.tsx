import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { MoreHorizontal, PanelRightOpen, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContactDetailToolbarProps {
  contactName: string;
  roleName: string | null;
  primaryCompanyName: string | null;
  sidebarOpen: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onOpenSidebar: () => void;
  onDelete: () => void;
}

export function ContactDetailToolbar({
  contactName,
  roleName,
  primaryCompanyName,
  sidebarOpen,
  canUpdate,
  canDelete,
  onOpenSidebar,
  onDelete,
}: ContactDetailToolbarProps) {
  const subtitle = [roleName, primaryCompanyName ? `at ${primaryCompanyName}` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="/app/directory/contacts" className="hover:text-foreground">
              Directory
            </Link>
            {' / '}
            <Link to="/app/directory/contacts" className="hover:text-foreground">
              Contacts
            </Link>
          </div>
          <ToolbarPageTitle>{contactName}</ToolbarPageTitle>
          <span className="max-w-full break-words text-sm text-muted-foreground">
            {subtitle || 'Directory contact'}
          </span>
        </ToolbarHeading>

        <ToolbarActions className="w-full sm:w-auto sm:justify-end">
          {canUpdate && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <Link to="edit">
                <Pencil className="size-4" />
                Edit Contact
              </Link>
            </Button>
          )}
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" mode="icon" aria-label="Contact actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 className="size-4" />
                  Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onOpenSidebar}
            >
              <PanelRightOpen className="size-4" />
              View Details
            </Button>
          )}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
