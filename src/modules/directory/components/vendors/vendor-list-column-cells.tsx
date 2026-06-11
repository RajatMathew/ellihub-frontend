import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { formatCurrency } from '@/app/lib/helpers';
import {
  getVendorContactCount,
  getVendorPrimaryContact,
  getVendorTypeCode,
  getVendorTypeLabel,
} from '@/modules/directory/components/vendors/vendor-list-utils';
import {
  VENDOR_STATUS_LABELS,
  VENDOR_TYPE_BADGE_VARIANTS,
} from '@/modules/directory/constants/vendors/vendor-list.constants';
import type { Vendor } from '@/modules/directory/schemas/vendor.schema';
import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VendorNameCellProps {
  vendor: Vendor;
}

export function VendorNameCell({ vendor }: VendorNameCellProps) {
  const contactCount = getVendorContactCount(vendor);

  return (
    <div className="flex min-w-0 max-w-[24rem] flex-col gap-0.5">
      <Link
        to={`${vendor.id}`}
        className="[overflow-wrap:anywhere] text-sm font-semibold leading-5 text-foreground hover:text-primary"
      >
        {vendor.name}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2sm text-muted-foreground">
          {contactCount} Contact{contactCount !== 1 ? 's' : ''}
        </span>
        {vendor.status !== 'ACTIVE' && (
          <Badge variant="secondary" size="sm">
            {VENDOR_STATUS_LABELS[vendor.status]}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function VendorTypeCell({
  vendor,
  typeLabels,
}: {
  vendor: Vendor;
  typeLabels: Map<string, string>;
}) {
  const { type } = vendor;
  if (!type) return <span className="text-xs italic text-muted-foreground">No type</span>;

  const typeLabel =
    typeof type === 'string' ? (typeLabels.get(type) ?? type) : getVendorTypeLabel(type);
  const typeCode = getVendorTypeCode(type);
  const variant =
    typeCode && typeCode in VENDOR_TYPE_BADGE_VARIANTS
      ? VENDOR_TYPE_BADGE_VARIANTS[typeCode]
      : 'primary';

  return (
    <Badge variant={variant} appearance="outline" size="sm">
      {typeLabel}
    </Badge>
  );
}

export function VendorContactCell({ vendor }: VendorNameCellProps) {
  const contact = getVendorPrimaryContact(vendor);
  const contactName = contact?.fullName;
  const contactEmail = contact?.email?.[0]?.email;

  if (!contactName) {
    if (!vendor.email) return <span className="text-sm text-muted-foreground">-</span>;

    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="break-words text-sm font-medium leading-tight text-foreground">
          {vendor.name}
        </span>
        <span className="break-all text-xs text-muted-foreground">{vendor.email}</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-[22rem] flex-col gap-0.5">
      <span className="[overflow-wrap:anywhere] text-sm font-medium leading-5 text-foreground">
        {contactName}
      </span>
      {contactEmail && (
        <span className="break-all text-xs text-muted-foreground">{contactEmail}</span>
      )}
    </div>
  );
}

export function VendorDocumentCountCell({ vendor }: VendorNameCellProps) {
  const count = vendor.documentCount ?? vendor._count?.documents ?? 0;

  return (
    <span className="text-sm text-foreground">
      {count} Document{count === 1 ? '' : 's'}
    </span>
  );
}

export function VendorCurrencyCell({ value }: { value: number }) {
  return <span className="text-sm font-medium text-foreground">{formatCurrency(value)}</span>;
}

export function VendorActionsCell({
  vendor,
  canUpdate,
  canDelete,
  onDelete,
}: {
  vendor: Vendor;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          mode="icon"
          size="sm"
          className="size-7"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Open actions for ${vendor.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link to={`${vendor.id}`}>View</Link>
        </DropdownMenuItem>
        {canUpdate && (
          <DropdownMenuItem asChild>
            <Link to={`${vendor.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(vendor.id)}
            >
              Archive
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
