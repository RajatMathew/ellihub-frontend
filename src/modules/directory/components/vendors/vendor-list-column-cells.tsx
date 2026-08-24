import { Badge } from '@/app/components/ui/badge';
import {
  getVendorPrimaryContact,
  getVendorTypeCode,
  getVendorTypeLabel,
} from '@/modules/directory/components/vendors/vendor-list-utils';
import { VENDOR_TYPE_BADGE_VARIANTS } from '@/modules/directory/constants/vendors/vendor-list.constants';
import type { Vendor } from '@/modules/directory/schemas/vendor.schema';

/**
 * The two vendor cells the column factories cannot express.
 *
 * Everything else — the name link, the document count, both currency columns and
 * the row menu — is now `col.link` / `col.text` / `col.currency` / `col.actions`
 * in `vendor-list-columns.tsx`.
 *
 * Vendor type is a badge, but not a *status* badge: it is a taxonomy with its own
 * colour map, so it stays on `Badge` rather than `StatusBadge`. Contact renders
 * two different shapes depending on whether a primary contact exists.
 */

interface VendorCellProps {
  vendor: Vendor;
}

export function VendorTypeCell({
  vendor,
  typeLabels,
}: VendorCellProps & { typeLabels: Map<string, string> }) {
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
    <Badge appearance="light" size="sm" variant={variant} className="min-w-0 max-w-full">
      <span className="truncate">{typeLabel}</span>
    </Badge>
  );
}

export function VendorContactCell({ vendor }: VendorCellProps) {
  const contact = getVendorPrimaryContact(vendor);
  const contactName = contact?.fullName;
  const contactEmail = contact?.email?.[0]?.email;

  if (!contactName) {
    if (!vendor.email) return <span className="text-sm text-muted-foreground">-</span>;

    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{vendor.name}</span>
        <span className="truncate text-xs text-muted-foreground">{vendor.email}</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-medium text-foreground">{contactName}</span>
      {contactEmail && (
        <span className="truncate text-xs text-muted-foreground">{contactEmail}</span>
      )}
    </div>
  );
}
