import { useEffect, useMemo, useRef } from 'react';

import { SidebarGroupMenu } from '@/app/components/sidebar/sidebar-menu-group';
import type { MenuConfig } from '@/app/config/types';
import { emailApi, type EmailAccount, type SharedMailboxKey } from '@/modules/email/api';
import { EmailAliasLabel } from '@/modules/email/components/email-alias-label';
import {
  EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
  EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
} from '@/modules/email/constants/email-account-storage';
import { emailKeys, useEmailAccountsQuery } from '@/modules/email/hooks';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Plus } from 'lucide-react';

type StoredEmailAccount = Pick<
  EmailAccount,
  'id' | 'slug' | 'mailboxAddress' | 'provider' | 'email' | 'displayName'
>;

const SHARED_MAILBOXES: Array<{ key: SharedMailboxKey; title: string; path: string }> = [
  { key: 'procurement', title: 'Procurement', path: '../email/procurement' },
  { key: 'requisitions', title: 'Requisitions', path: '../email/requisitions' },
  { key: 'contracts', title: 'Contracts', path: '../email/contracts' },
];

export function EmailSidebarMenu() {
  const queryClient = useQueryClient();
  const cleanedAccountIdsRef = useRef(new Set<string>());
  const accountsQuery = useEmailAccountsQuery();
  const connectedAccounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const sharedAccounts = useMemo(
    () => connectedAccounts.filter((account) => account.sharedMailboxKey),
    [connectedAccounts]
  );
  const personalAccounts = useMemo(
    () => connectedAccounts.filter((account) => !account.sharedMailboxKey),
    [connectedAccounts]
  );
  const primaryPersonalAccount = personalAccounts[0];
  const extraPersonalAccounts = useMemo(() => personalAccounts.slice(1), [personalAccounts]);

  useEffect(() => {
    // Personal account identities must not survive a user switch in shared browser storage.
    window.localStorage.removeItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY);
    window.localStorage.removeItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const accountsToDisconnect = extraPersonalAccounts.filter(
      (account) => !cleanedAccountIdsRef.current.has(account.id)
    );
    if (accountsToDisconnect.length === 0) return;

    accountsToDisconnect.forEach((account) => cleanedAccountIdsRef.current.add(account.id));
    queryClient.setQueryData<EmailAccount[]>(
      emailKeys.accounts(),
      primaryPersonalAccount ? [...sharedAccounts, primaryPersonalAccount] : [...sharedAccounts]
    );

    void Promise.allSettled(
      accountsToDisconnect.map((account) => emailApi.disconnectAccount(account.id))
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          cleanedAccountIdsRef.current.delete(accountsToDisconnect[index].id);
        }
      });
      void queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
    });
  }, [extraPersonalAccounts, primaryPersonalAccount, queryClient, sharedAccounts]);

  const emailMenu = useMemo<MenuConfig>(() => {
    return [
      {
        type: 'group-collapsed',
        title: 'Email',
        collapse: false,
        children: [
          ...SHARED_MAILBOXES.map((mailbox) => {
            const account = sharedAccounts.find(
              (candidate) => candidate.sharedMailboxKey === mailbox.key
            );
            return {
              title: account?.displayName || mailbox.title,
              path: mailbox.path,
              icon: Mail,
            };
          }),
          {
            type: 'separator',
          },
          ...personalAccounts.slice(0, 1).map((account) => {
            const address = getSidebarAccountAddress(account);
            return {
              title: address,
              path: `../email/accounts/${getEmailAccountSlug(account)}`,
              icon: Mail,
              render: () => <EmailAliasLabel value={address} />,
            };
          }),
          ...(personalAccounts.length === 0
            ? [
                {
                  title: 'Add personal account',
                  path: '../email/add-account',
                  icon: Plus,
                },
              ]
            : []),
        ],
      },
    ];
  }, [personalAccounts, sharedAccounts]);

  return (
    <section aria-label="Email">
      <SidebarGroupMenu menu={emailMenu} name="email" />
    </section>
  );
}

function getSidebarAccountAddress(account: StoredEmailAccount) {
  return account.mailboxAddress || account.email;
}
