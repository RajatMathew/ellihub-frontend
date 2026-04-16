export function getContactDisplayEmail(link: any): string | null {
  const email = link.contact?.email;
  if (!email) return null;
  if (Array.isArray(email)) return (email[0] as any)?.email ?? null;
  if (typeof email === 'object') return (email as any).email ?? null;
  if (typeof email === 'string') return email;
  return null;
}

export function getContactDisplayPhone(link: any): string | null {
  const phone = link.contact?.phoneNumber || link.contact?.phone;
  if (!phone) return null;
  if (Array.isArray(phone)) return (phone[0] as any)?.number ?? (phone[0] as any)?.phone ?? null;
  if (typeof phone === 'object') {
    return (phone as any).number ?? (phone as any).phone ?? null;
  }
  if (typeof phone === 'string') return phone;
  return null;
}
