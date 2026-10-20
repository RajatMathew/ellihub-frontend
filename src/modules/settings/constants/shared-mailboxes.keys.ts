import { emailKeys } from '@/modules/email/constants/email.keys';

export const sharedMailboxKeys = {
  all: ['settings', 'shared-mailboxes'] as const,
  vendorConnections: ['settings', 'shared-mailboxes', 'vendor-connections'] as const,
  pendingDiscovery: (id: string | null) =>
    ['settings', 'shared-mailboxes', 'pending-discovery', id] as const,
  batchSyncStatus: (accountIds: string[]) =>
    [
      'settings',
      'shared-mailboxes',
      'batch-sync-status',
      [...accountIds].sort().join(','),
    ] as const,
};

/**
 * What each change to the org's mailboxes makes stale.
 *
 * Anything that adds or takes away a mailbox also changes the mail account
 * list, so it refetches `emailKeys.accounts()`. The removals used to name
 * `['email', 'accounts']`, a key no query has, so a removed mailbox stayed in
 * the account bar until a reload (elli-ui#1254).
 */
export const sharedMailboxChangeKeys = {
  mailboxCreated: [sharedMailboxKeys.all],
  mailboxRemoved: [sharedMailboxKeys.all, emailKeys.accounts()],
  vendorConnectionRemoved: [
    sharedMailboxKeys.all,
    sharedMailboxKeys.vendorConnections,
    emailKeys.accounts(),
  ],
  discoveryConfirmed: [
    sharedMailboxKeys.all,
    sharedMailboxKeys.vendorConnections,
    emailKeys.accounts(),
  ],
};
