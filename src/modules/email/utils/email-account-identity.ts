type EmailAccountIdentity = {
  provider: string;
  email: string;
  mailboxAddress: string;
  sharedMailboxKey?: string | null;
};

export function getEmailAccountIdentityKey(account: EmailAccountIdentity): string {
  const address = (account.mailboxAddress || account.email).trim().toLowerCase();
  const scope = account.sharedMailboxKey ? `shared:${account.sharedMailboxKey}` : 'personal';
  return `${scope}:${account.provider}:${address}`;
}

export function dedupeEmailAccounts<T extends EmailAccountIdentity>(accounts: T[]): T[] {
  const identities = new Set<string>();

  return accounts.filter((account) => {
    const identity = getEmailAccountIdentityKey(account);
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });
}
