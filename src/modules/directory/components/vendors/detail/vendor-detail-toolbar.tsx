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
  VENDOR_STATUS_COLORS,
  VENDOR_STATUS_LABELS,
} from '@/modules/directory/constants/vendors/vendor-detail.constants';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { MoreHorizontal, PanelRightOpen, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getVendorTypeLabel } from './vendor-detail-utils';

interface VendorDetailToolbarProps {
  vendor: VendorDetail;
  sidebarOpen: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export function VendorDetailToolbar({
  vendor,
  sidebarOpen,
  canUpdate,
  canDelete,
  onDelete,
  onOpenSidebar,
}: VendorDetailToolbarProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="../.." relative="path" className="hover:text-foreground">
              Vendors
            </Link>
            {' / '}
            <span>Profile</span>
          </div>
          <ToolbarPageTitle>{vendor.name}</ToolbarPageTitle>
          <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <span>
              Type: <span className="text-foreground">{getVendorTypeLabel(vendor)}</span>
            </span>
            {vendor.taxId && (
              <span>
                Tax ID: <span className="text-foreground">{vendor.taxId}</span>
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${
                  VENDOR_STATUS_COLORS[vendor.status] ?? 'bg-muted-foreground'
                }`}
              />
              <span className="text-foreground">
                {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
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
                      Archive Vendor
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
