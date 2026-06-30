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
import {
  formatPTODate,
  formatPTOReference,
  getPTOEmployeeName,
  getPTOTypeLabel,
  PTOStatusBadge,
} from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import { CalendarDays, MoreHorizontal, PanelRightOpen, Pencil, Tag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PTODetailToolbarProps {
  pto: PTO;
  sidebarOpen: boolean;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export function PTODetailToolbar({
  pto,
  sidebarOpen,
  onDelete,
  onOpenSidebar,
}: PTODetailToolbarProps) {
  const isPending = pto.status === 'PENDING';

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to=".." relative="path" className="transition-colors hover:text-foreground">
              Time Off Requests
            </Link>
            {' / '}
            <span>Request Detail</span>
          </div>
          <ToolbarPageTitle>
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <span className="min-w-0 truncate">{getPTOEmployeeName(pto)}</span>
              <PTOStatusBadge status={pto.status} />
            </div>
          </ToolbarPageTitle>
          <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              <span className="truncate">
                {formatPTODate(pto.startDate)} - {formatPTODate(pto.endDate)}
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Tag className="size-3.5 shrink-0" />
              <span className="truncate">{getPTOTypeLabel(pto)}</span>
            </span>
            <span className="font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              {formatPTOReference(pto.id, 6)}
            </span>
          </div>
        </ToolbarHeading>
        <ToolbarActions className="w-full sm:w-auto sm:justify-end">
          {isPending && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <Link to="edit">
                <Pencil className="size-4" />
                Modify Request
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" mode="icon" size="sm" className="shrink-0">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Time off request actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
          {!sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onOpenSidebar}
            >
              <PanelRightOpen className="size-4" />
              Details
            </Button>
          )}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
