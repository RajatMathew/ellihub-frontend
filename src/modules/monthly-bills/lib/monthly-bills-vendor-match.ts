import type { QuickBooksPayee } from '@/modules/integrations/schemas/quickbooks.schema';

export interface VendorMatch {
  vendor: QuickBooksPayee;
  reason: string;
}

/** Suggest the QuickBooks vendor that most likely maps to this ElliHub vendor. */
export function findVendorMatch(
  vendors: QuickBooksPayee[],
  vendorName: string
): VendorMatch | null {
  const target = vendorName.trim().toLowerCase();
  if (!target) return null;

  const exact = vendors.find((vendor) => vendor.displayName.trim().toLowerCase() === target);
  if (exact) return { vendor: exact, reason: 'Names match exactly.' };

  const overlapping = vendors.find((vendor) => {
    const name = vendor.displayName.trim().toLowerCase();
    return name.includes(target) || target.includes(name);
  });
  if (overlapping) return { vendor: overlapping, reason: 'One vendor name contains the other.' };

  return null;
}
