import { useEffect, useMemo, useState, type MouseEvent } from 'react';

import { SidebarGroupMenu } from '@/app/components/sidebar/sidebar-menu-group';
import type { MenuConfig } from '@/app/config/types';
import type { EmailAccount } from '@/modules/email/api';
import {
  EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
  EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
} from '@/modules/email/constants/email-account-storage';
import { useEmailAccountsQuery } from '@/modules/email/hooks';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';

type StoredEmailAccount = Pick<
  EmailAccount,
  'id' | 'slug' | 'mailboxAddress' | 'displayName' | 'provider' | 'email'
>;

const staticEmailMenu: MenuConfig = [
  {
    type: 'group-collapsed',
    title: 'Emails',
    collapse: false,
    children: [
      { title: 'procurement@ellicorp.com', path: '../email/procurement' },
      { title: 'requisitions@ellicorp.com', path: '../email/requisitions' },
      { title: 'contracts@ellicorp.com', path: '../email/contracts' },
    ],
  },
];

export function EmailSidebarMenu() {
  const [storedAccounts] = useState<StoredEmailAccount[]>(readStoredAccounts);
  const accountsQuery = useEmailAccountsQuery();
  const connectedAccounts = accountsQuery.data ?? storedAccounts;

  useEffect(() => {
    if (!accountsQuery.data) return;

    const accounts = accountsQuery.data.map(toStoredAccount);
    writeStoredAccounts(accounts);
  }, [accountsQuery.data]);

  const connectedMenu = useMemo<MenuConfig>(() => {
    if (!connectedAccounts.length) return [];

    return [
      {
        type: 'group-collapsed',
        title: 'Connected Accounts',
        collapse: false,
        children: connectedAccounts.map((account) => ({
          title: account.mailboxAddress,
          path: `../email/accounts/${getEmailAccountSlug(account)}`,
        })),
      },
    ];
  }, [connectedAccounts]);

  return (
    <>
      <SidebarGroupMenu menu={staticEmailMenu} name="emails-static" />
      {connectedMenu.length > 0 && (
        <div onClickCapture={rememberSelectedAccountFromClick}>
          <SidebarGroupMenu menu={connectedMenu} name="emails-connected" />
        </div>
      )}
    </>
  );
}

function toStoredAccount(account: EmailAccount): StoredEmailAccount {
  return {
    id: account.id,
    slug: getEmailAccountSlug(account),
    email: account.email,
    mailboxAddress: account.mailboxAddress,
    displayName: account.displayName,
    provider: account.provider,
  };
}

function readStoredAccounts(): StoredEmailAccount[] {
  if (typeof window === 'undefined') return [];

  try {
    const value = window.localStorage.getItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as StoredEmailAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredAccounts(accounts: StoredEmailAccount[]) {
  window.localStorage.setItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function rememberSelectedAccountFromClick(event: MouseEvent<HTMLDivElement>) {
  const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
    'a[href*="/email/accounts/"]'
  );
  const accountSlug = anchor?.href.match(/\/email\/accounts\/([^/?#]+)/)?.[1];
  if (accountSlug) {
    window.localStorage.setItem(
      EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
      decodeURIComponent(accountSlug)
    );
  }
}
