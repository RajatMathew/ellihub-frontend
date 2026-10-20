import { useCallback, useEffect, useMemo, useRef } from 'react';

import { SidebarGroupMenu } from '@/app/components/sidebar/sidebar-menu-group';
import { Button } from '@/app/components/ui/button';
import type { MenuConfig } from '@/app/config/types';
import { emailApi, type EmailAccount } from '@/modules/email/api';
import { EmailAliasLabel } from '@/modules/email/components/email-alias-label';
import {
  EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
  EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
} from '@/modules/email/constants/email-account-storage';
import { emailKeys, useEmailAccountsQuery, useEmailConfigQuery } from '@/modules/email/hooks';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, Settings2 } from 'lucide-react';
import { Link, useMatch } from 'react-router-dom';

type StoredEmailAccount = Pick<
  EmailAccount,
  'id' | 'slug' | 'mailboxAddress' | 'provider' | 'email' | 'displayName'
>;

export function EmailSidebarMenu() {
  const queryClient = useQueryClient();
  const cleanedAccountIdsRef = useRef(new Set<string>());
  const accountsQuery = useEmailAccountsQuery();
  const configQuery = useEmailConfigQuery();
  // Whichever account's mailbox is on screen right now, if any — found by URL
  // rather than accepted as a prop, since this menu is mounted once in the
  // persistent sidebar, outside the routes it needs to know about.
  const activeAccountMatch = useMatch('/app/email/accounts/:accountSlug/*');
  const activeAccountSlug = activeAccountMatch?.params.accountSlug;
  const connectedAccounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const maxPersonalAccounts = configQuery.data?.maxPersonalAccounts ?? Number.POSITIVE_INFINITY;
  const sharedAccounts = useMemo(
    () => connectedAccounts.filter((account) => account.sharedMailboxKey),
    [connectedAccounts]
  );
  const personalAccounts = useMemo(
    () => connectedAccounts.filter((account) => !account.sharedMailboxKey),
    [connectedAccounts]
  );
  const isActiveAccount = useCallback(
    (account: EmailAccount) =>
      activeAccountSlug != null &&
      (getEmailAccountSlug(account) === activeAccountSlug || account.id === activeAccountSlug),
    [activeAccountSlug]
  );
  // Never auto-disconnect the account on screen (elli-ui#873).
  const visiblePersonalAccounts = useMemo(() => {
    const withinLimit = personalAccounts.slice(0, maxPersonalAccounts);
    const activeBeyondLimit = personalAccounts.slice(maxPersonalAccounts).find(isActiveAccount);
    return activeBeyondLimit ? [...withinLimit, activeBeyondLimit] : withinLimit;
  }, [isActiveAccount, maxPersonalAccounts, personalAccounts]);
  const extraPersonalAccounts = useMemo(
    () =>
      personalAccounts.slice(maxPersonalAccounts).filter((account) => !isActiveAccount(account)),
    [isActiveAccount, maxPersonalAccounts, personalAccounts]
  );

  useEffect(() => {
    // Personal account identities must not survive a user switch in shared browser storage.
    window.localStorage.removeItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY);
    window.localStorage.removeItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!configQuery.data) return;

    const accountsToDisconnect = extraPersonalAccounts.filter(
      (account) => !cleanedAccountIdsRef.current.has(account.id)
    );
    if (accountsToDisconnect.length === 0) return;

    accountsToDisconnect.forEach((account) => cleanedAccountIdsRef.current.add(account.id));
    queryClient.setQueryData<EmailAccount[]>(emailKeys.accounts(), [
      ...sharedAccounts,
      ...visiblePersonalAccounts,
    ]);

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
  }, [
    configQuery.data,
    extraPersonalAccounts,
    queryClient,
    sharedAccounts,
    visiblePersonalAccounts,
  ]);

  const emailMenu = useMemo<MenuConfig>(() => {
    return [
      {
        type: 'group-collapsed',
        title: 'Email',
        collapse: false,
        children: [
          { type: 'separator', title: 'Common' },
          ...sharedAccounts.map((account) => {
            return {
              title: account.displayName || account.mailboxAddress,
              path: `../email/accounts/${getEmailAccountSlug(account)}`,
              icon: Mail,
            };
          }),
          { type: 'separator', title: 'Personal' },
          ...visiblePersonalAccounts.map((account) => {
            const address = getSidebarAccountAddress(account);
            return {
              title: address,
              path: `../email/accounts/${getEmailAccountSlug(account)}`,
              icon: Mail,
              render: () => <EmailAliasLabel value={address} />,
            };
          }),
          ...(configQuery.data && personalAccounts.length < maxPersonalAccounts
            ? [
                {
                  title: 'Add account',
                  path: '../email/add-account',
                  icon: Plus,
                },
              ]
            : []),
        ],
      },
    ];
  }, [
    configQuery.data,
    maxPersonalAccounts,
    personalAccounts.length,
    sharedAccounts,
    visiblePersonalAccounts,
  ]);

  return (
    <section aria-label="Email">
      <SidebarGroupMenu
        menu={emailMenu}
        name="email"
        headerAction={
          // Manage accounts, one click from the mailbox list (elli-ui#1082) —
          // in the spot, and the icon, Quick Shortcuts uses for its own.
          <Button
            asChild
            variant="ghost"
            mode="icon"
            size="sm"
            className="shrink-0 text-sidebar-muted hover:bg-sidebar-item-hover hover:text-sidebar-foreground"
          >
            <Link to="/app/email/accounts" aria-label="Manage accounts" title="Manage accounts">
              <Settings2 />
            </Link>
          </Button>
        }
      />
    </section>
  );
}

function getSidebarAccountAddress(account: StoredEmailAccount) {
  return account.mailboxAddress || account.email;
}
