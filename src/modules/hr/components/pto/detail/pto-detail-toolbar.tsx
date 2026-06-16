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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { formatPTOReference, PTOStatusBadge } from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PTODetailToolbarProps {
  pto: PTO;
  onDelete: () => void;
}

export function PTODetailToolbar({ pto, onDelete }: PTODetailToolbarProps) {
  const isPending = pto.status === 'PENDING';

  return (
    <Toolbar sticky={false}>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <div className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            HR / Time Off / Request Detail
          </div>
          <ToolbarPageTitle>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span>{formatPTOReference(pto.id, 6)}</span>
              <PTOStatusBadge status={pto.status} />
            </div>
          </ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions className="w-full sm:w-auto sm:justify-end">
          {isPending && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <Link to="edit">
                <Pencil className="size-4" />
                Modify
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" mode="icon" size="sm" className="size-8">
                <EllipsisVertical className="size-4" />
                <span className="sr-only">PTO actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {isPending && (
                <DropdownMenuItem asChild>
                  <Link to="edit">
                    <Pencil className="size-4" />
                    Edit Request
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" />
                Delete Request
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
