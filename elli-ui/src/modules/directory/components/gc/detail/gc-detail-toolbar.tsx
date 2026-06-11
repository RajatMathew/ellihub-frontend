import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  GC_STATUS_COLORS,
  GC_STATUS_LABELS,
  GC_TYPE_BADGE_VARIANTS,
} from '@/modules/directory/constants/gc/gc-detail.constants';
import type { GeneralContractorDetail } from '@/modules/directory/schemas/gc.schema';
import { MoreHorizontal, PanelRightOpen, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getGCTypeCode, getGCTypeName } from './gc-detail-utils';

interface GCDetailToolbarProps {
  gc: GeneralContractorDetail;
  sidebarOpen: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export function GCDetailToolbar({
  gc,
  sidebarOpen,
  canUpdate,
  canDelete,
  onDelete,
  onOpenSidebar,
}: GCDetailToolbarProps) {
  const typeCode = getGCTypeCode(gc);

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="../.." relative="path" className="hover:text-foreground">
              Directory
            </Link>
            {' / '}
            <Link to=".." relative="path" className="hover:text-foreground">
              General Contractors
            </Link>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <ToolbarPageTitle>{gc.name}</ToolbarPageTitle>
            <Badge
              variant={typeCode ? (GC_TYPE_BADGE_VARIANTS[typeCode] ?? 'primary') : 'primary'}
              appearance="outline"
              size="sm"
            >
              {getGCTypeName(gc)}
            </Badge>
            <div className="flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${
                  GC_STATUS_COLORS[gc.status] ?? 'bg-muted-foreground'
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {GC_STATUS_LABELS[gc.status] ?? gc.status}
              </span>
            </div>
          </div>
        </ToolbarHeading>
        <ToolbarActions className="w-full sm:w-auto sm:justify-end">
          {canUpdate && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <Link to="edit">
                <Pencil className="size-4" />
                Edit Profile
              </Link>
            </Button>
          )}
          {(canUpdate || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" mode="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canUpdate && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4" />
                      Edit Profile
                    </Link>
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    {canUpdate && <DropdownMenuSeparator />}
                    <DropdownMenuItem variant="destructive" onClick={onDelete}>
                      <Trash2 className="size-4" />
                      Archive GC
                    </DropdownMenuItem>
                  </>
                )}
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
