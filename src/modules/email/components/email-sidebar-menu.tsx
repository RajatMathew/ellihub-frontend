import { useEffect, useMemo } from 'react';

import { SidebarGroupMenu } from '@/app/components/sidebar/sidebar-menu-group';
import type { MenuConfig } from '@/app/config/types';
import type { EmailAccount } from '@/modules/email/api';
import { EmailAliasLabel } from '@/modules/email/components/email-alias-label';
import {
  EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
  EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
} from '@/modules/email/constants/email-account-storage';
import { useEmailAccountsQuery } from '@/modules/email/hooks';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { Mail, Plus } from 'lucide-react';

type StoredEmailAccount = Pick<
  EmailAccount,
  'id' | 'slug' | 'mailboxAddress' | 'provider' | 'email'
>;

export function EmailSidebarMenu() {
  const accountsQuery = useEmailAccountsQuery();
  const connectedAccounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);

  useEffect(() => {
    // Personal account identities must not survive a user switch in shared browser storage.
    window.localStorage.removeItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY);
    window.localStorage.removeItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);
  }, []);

  const emailMenu = useMemo<MenuConfig>(() => {
    return [
      {
        type: 'group-collapsed',
        title: 'Email',
        collapse: false,
        children: [
          {
            title: 'Procurement',
            path: '../email/procurement',
            icon: Mail,
          },
          {
            title: 'Requisitions',
            path: '../email/requisitions',
            icon: Mail,
          },
          {
            title: 'Contracts',
            path: '../email/contracts',
            icon: Mail,
          },
          ...connectedAccounts.map((account) => {
            const address = getSidebarAccountAddress(account);
            return {
              title: address,
              path: `../email/accounts/${getEmailAccountSlug(account)}`,
              icon: Mail,
              render: () => <EmailAliasLabel value={address} />,
            };
          }),
          {
            title: 'Add personal account',
            path: '../email/add-account',
            icon: Plus,
          },
        ],
      },
    ];
  }, [connectedAccounts]);

  return (
    <section aria-label="Email">
      <SidebarGroupMenu menu={emailMenu} name="email" />
    </section>
  );
}

function getSidebarAccountAddress(account: StoredEmailAccount) {
  return account.mailboxAddress || account.email;
}
