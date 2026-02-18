import type { GCContactLink } from '../schemas/gc.schema';
import type { VendorContactLink } from '../schemas/vendor.schema';

type ContactLink = GCContactLink | VendorContactLink;

export function getContactDisplayEmail(link: ContactLink): string | null {
  const email = link.contact?.email;
  if (!email) return null;
  if (typeof email === 'object' && 'email' in email) return email.email;
  if (typeof email === 'string') return email;
  return null;
}

export function getContactDisplayPhone(link: ContactLink): string | null {
  const phone = link.contact?.phoneNumber;
  if (!phone) return null;
  if (typeof phone === 'object' && 'phone' in phone) return phone.phone;
  if (typeof phone === 'string') return phone;
  return null;
}
