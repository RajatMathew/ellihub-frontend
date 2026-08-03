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
import { getEmailAccountNicknameLocalPart } from '@/modules/email/schemas/email-account.schema';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { Mail, Plus } from 'lucide-react';

type StoredEmailAccount = Pick<
  EmailAccount,
  'id' | 'slug' | 'mailboxAddress' | 'displayName' | 'nickname' | 'provider' | 'email'
>;

export function EmailSidebarMenu() {
  const accountsQuery = useEmailAccountsQuery();
  const connectedAccounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);

  useEffect(() => {
    // Personal account identities must not survive a user switch in shared browser storage.
    window.localStorage.removeItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY);
    window.localStorage.removeItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);
  }, []);

  const mainMenu = useMemo<MenuConfig>(() => {
    return [
      {
        type: 'group-collapsed',
        title: 'Main',
        collapse: false,
        children: [
          {
            title: 'procurement@ellicorp.com',
            path: '../email/procurement',
            icon: Mail,
          },
          {
            title: 'requisitions@ellicorp.com',
            path: '../email/requisitions',
            icon: Mail,
          },
          {
            title: 'contracts@ellicorp.com',
            path: '../email/contracts',
            icon: Mail,
          },
        ],
      },
    ];
  }, []);

  const personalMenu = useMemo<MenuConfig>(() => {
    return [
      {
        type: 'group-collapsed',
        title: 'Personal accounts',
        collapse: false,
        children: [
          ...connectedAccounts.map((account) => {
            const alias = getSidebarAccountName(account);
            return {
              title: alias,
              path: `../email/accounts/${getEmailAccountSlug(account)}`,
              icon: Mail,
              render: () => <EmailAliasLabel value={alias} />,
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
    <section aria-labelledby="email-sidebar-heading">
      <h2
        id="email-sidebar-heading"
        className="px-5 pb-1 text-[11px] font-semibold uppercase text-sidebar-foreground"
      >
        Email
      </h2>
      <SidebarGroupMenu menu={mainMenu} name="email-main" />
      <SidebarGroupMenu menu={personalMenu} name="email-personal" />
    </section>
  );
}

function getSidebarAccountName(account: StoredEmailAccount) {
  const preferredName = account.nickname || account.displayName;
  const mailboxLocalPart = account.mailboxAddress.split('@')[0] || account.email.split('@')[0];
  const localPart =
    getEmailAccountNicknameLocalPart(preferredName || '') ||
    getEmailAccountNicknameLocalPart(mailboxLocalPart || '') ||
    'email';

  return `${localPart}@ellicorp.com`;
}
