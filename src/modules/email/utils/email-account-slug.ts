import type { EmailAccount } from '@/modules/email/api';

export function getEmailAccountSlug(
  account: Pick<EmailAccount, 'email' | 'mailboxAddress' | 'id' | 'slug'>
) {
  if (account.slug) return account.slug;

  const address = account.mailboxAddress || account.email;
  const localPart = address.split('@')[0] || address;
  const slug = localPart
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || account.id;
}
