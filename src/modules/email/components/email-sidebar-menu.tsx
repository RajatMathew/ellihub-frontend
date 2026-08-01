import { useEffect, useMemo, useState, type MouseEvent } from 'react';

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
import { dedupeEmailAccounts } from '@/modules/email/utils/email-account-identity';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { Mail, Plus } from 'lucide-react';

type StoredEmailAccount = Pick<
  EmailAccount,
  'id' | 'slug' | 'mailboxAddress' | 'displayName' | 'nickname' | 'provider' | 'email'
>;

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
    return [
      {
        type: 'group-collapsed',
        title: 'Emails',
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
            title: 'Add account',
            path: '../email/add-account',
            icon: Plus,
          },
        ],
      },
    ];
  }, [connectedAccounts]);

  return (
    <div onClickCapture={rememberSelectedAccountFromClick}>
      <SidebarGroupMenu menu={connectedMenu} name="emails" />
    </div>
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

function toStoredAccount(account: EmailAccount): StoredEmailAccount {
  return {
    id: account.id,
    slug: getEmailAccountSlug(account),
    email: account.email,
    mailboxAddress: account.mailboxAddress,
    displayName: account.displayName,
    nickname: account.nickname,
    provider: account.provider,
  };
}

function readStoredAccounts(): StoredEmailAccount[] {
  if (typeof window === 'undefined') return [];

  try {
    const value = window.localStorage.getItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as StoredEmailAccount[];
    return Array.isArray(parsed) ? dedupeEmailAccounts(parsed) : [];
  } catch {
    return [];
  }
}

function writeStoredAccounts(accounts: StoredEmailAccount[]) {
  window.localStorage.setItem(
    EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(dedupeEmailAccounts(accounts))
  );
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
