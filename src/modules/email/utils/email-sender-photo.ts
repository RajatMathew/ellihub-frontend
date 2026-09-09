/**
 * Whether a sender can possibly have a profile photo on a given account.
 *
 * The photo endpoint reads Microsoft Graph's `/users/{address}/photos/...`,
 * which answers out of the directory of the tenant the mailbox's token belongs
 * to. An external sender — `robyn@eagle-aluminum.com` on an `@ellicorp.com`
 * mailbox — can never resolve there, and neither can anyone at all on a Gmail
 * or Zoho account. Rendering the `<img>` anyway put a failing request in
 * DevTools for every such sender (elli-ui#872).
 *
 * elli-core applies the same rule server-side (`internal/sender-photo.ts`), so
 * this is not the security boundary — it is what keeps the request from being
 * made. Keep the two in step.
 */

/**
 * Domains that are not Entra ID tenants: no directory behind them, so sharing
 * one says nothing about whether two people can see each other.
 */
const CONSUMER_EMAIL_DOMAINS = new Set([
  'aol.com',
  'gmail.com',
  'googlemail.com',
  'hotmail.co.uk',
  'hotmail.com',
  'icloud.com',
  'live.co.uk',
  'live.com',
  'mac.com',
  'me.com',
  'msn.com',
  'outlook.com',
  'passport.com',
  'proton.me',
  'protonmail.com',
  'yahoo.com',
]);

/** The only provider whose accounts expose profile photos. */
const PHOTO_CAPABLE_PROVIDER = 'outlook';

export type SenderPhotoAccount = {
  provider: string;
  email: string;
  mailboxAddress?: string | null;
};

export function normalizeSenderAddress(address: string): string {
  return address.trim().toLowerCase();
}

/** The domain of an address, or null when it does not have exactly one `@`. */
export function getEmailAddressDomain(address: string): string | null {
  const normalized = normalizeSenderAddress(address);
  const at = normalized.indexOf('@');
  if (at <= 0 || at !== normalized.lastIndexOf('@')) return null;
  const domain = normalized.slice(at + 1);
  return domain.length > 0 ? domain : null;
}

/**
 * Every address the account reads mail as — the connecting user, plus the
 * shared mailbox when there is one. They can sit on different domains.
 */
export function getAccountMailboxAddresses(account: SenderPhotoAccount): string[] {
  return [account.mailboxAddress, account.email]
    .map((value) => (value ? normalizeSenderAddress(value) : ''))
    .filter((value) => value.length > 0);
}

/** The domains the account's tenant is known to own. */
export function getAccountTenantDomains(account: SenderPhotoAccount): Set<string> {
  const domains = new Set<string>();
  for (const address of getAccountMailboxAddresses(account)) {
    const domain = getEmailAddressDomain(address);
    if (domain && !CONSUMER_EMAIL_DOMAINS.has(domain)) domains.add(domain);
  }
  return domains;
}

export function canSenderHavePhoto(
  account: SenderPhotoAccount | undefined,
  address: string | undefined
): boolean {
  if (!account || !address) return false;
  if (account.provider !== PHOTO_CAPABLE_PROVIDER) return false;

  const sender = normalizeSenderAddress(address);
  if (getAccountMailboxAddresses(account).includes(sender)) return true;

  const domain = getEmailAddressDomain(sender);
  if (!domain) return false;
  return getAccountTenantDomains(account).has(domain);
}
