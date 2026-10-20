import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { EmailAccount } from '@/modules/email/api';
import {
  EmailAccountEmptyState,
  EmailAccountsErrorState,
  EmailAccountsLoadingState,
} from '@/modules/email/components/email-account-empty-state';
import { EMAIL_PROVIDER_DETAILS } from '@/modules/email/constants/email-providers';
import {
  useDisconnectEmailAccountMutation,
  useEmailAccountsQuery,
  useEmailConfigQuery,
  useStartEmailAuthMutation,
} from '@/modules/email/hooks';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { LogOut, MailCheck, MailOpen, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmailAccountsPage() {
  const accountsQuery = useEmailAccountsQuery();
  const configQuery = useEmailConfigQuery();
  const startAuthMutation = useStartEmailAuthMutation();
  const disconnectMutation = useDisconnectEmailAccountMutation();
  const [disconnectingAccount, setDisconnectingAccount] = useState<EmailAccount | null>(null);

  if (accountsQuery.isLoading || configQuery.isLoading) return <EmailAccountsLoadingState />;
  if (accountsQuery.isError) {
    return <EmailAccountsErrorState onRetry={() => void accountsQuery.refetch()} />;
  }
  if (configQuery.isError) {
    return <EmailAccountsErrorState onRetry={() => void configQuery.refetch()} />;
  }
  if (!configQuery.data) return <EmailAccountsLoadingState />;

  const accounts = (accountsQuery.data ?? []).filter((account) => !account.sharedMailboxKey);
  const emailConfig = configQuery.data;
  const maxPersonalAccounts = emailConfig.maxPersonalAccounts;
  const canAddPersonalAccount = accounts.length < maxPersonalAccounts;
  if (accounts.length === 0) {
    if (maxPersonalAccounts === 0) {
      return (
        <EmailAccountEmptyState
          title="Personal email accounts disabled"
          description="Personal mailbox connections are disabled for this environment."
          connectionsDisabled
        />
      );
    }
    return <EmailAccountEmptyState />;
  }

  return (
    <>
      <main className="flex h-[calc(100dvh-var(--header-height-mobile))] overflow-y-auto bg-muted/20 px-4 py-10 lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)] lg:px-8">
        <section
          className="m-auto w-full max-w-3xl"
          aria-labelledby="personal-email-accounts-heading"
        >
          <header className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-background text-primary shadow-xs">
              <MailCheck aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </div>
            <h1
              id="personal-email-accounts-heading"
              className="mt-5 text-2xl font-semibold tracking-tight text-foreground"
            >
              Personal email accounts
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Open a mailbox, update its Elli email name, or manage its connection. These accounts
              are visible only to you.
            </p>
          </header>

          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-background shadow-xs">
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                isReconnecting={
                  startAuthMutation.isPending &&
                  startAuthMutation.variables?.loginHint === account.mailboxAddress
                }
                onReconnect={() =>
                  startAuthMutation.mutate({
                    provider: account.provider,
                    loginHint: account.mailboxAddress,
                  })
                }
                canReconnect={emailConfig.enabledProviders.includes(account.provider)}
                onDisconnect={() => setDisconnectingAccount(account)}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
            <p className="text-xs text-muted-foreground">
              {accounts.length} of {maxPersonalAccounts}{' '}
              {maxPersonalAccounts === 1 ? 'account' : 'accounts'} connected
            </p>
            {canAddPersonalAccount && (
              <Button asChild variant="outline" size="sm" className="min-h-10">
                <Link to="/app/email/add-account">
                  <Plus aria-hidden="true" className="size-4" />
                  Add personal account
                </Link>
              </Button>
            )}
          </div>
        </section>
      </main>

      <ConfirmDialog
        open={Boolean(disconnectingAccount)}
        onOpenChange={(open) => {
          if (!open && !disconnectMutation.isPending) setDisconnectingAccount(null);
        }}
        title="Log out of this email account?"
        description={
          disconnectingAccount
            ? `${disconnectingAccount.mailboxAddress} will be removed from Elli. Your provider mailbox and its messages will not be deleted.`
            : ''
        }
        confirmLabel={disconnectMutation.isPending ? 'Logging out...' : 'Log out'}
        variant="destructive"
        isPending={disconnectMutation.isPending}
        keepOpenOnConfirm
        onConfirm={() => {
          if (!disconnectingAccount) return;
          disconnectMutation.mutate(
            { accountId: disconnectingAccount.id },
            { onSuccess: () => setDisconnectingAccount(null) }
          );
        }}
      />
    </>
  );
}

function AccountRow({
  account,
  isReconnecting,
  canReconnect,
  onReconnect,
  onDisconnect,
}: {
  account: EmailAccount;
  isReconnecting: boolean;
  canReconnect: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
}) {
  const needsReconnect = accountNeedsReconnect(account);
  const hasSyncIssue = !needsReconnect && account.freshness?.state === 'error';
  const nickname = account.nickname || account.displayName || account.mailboxAddress;
  const providerDetails = EMAIL_PROVIDER_DETAILS[account.provider];

  return (
    <article className="flex flex-col gap-4 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
          <img src={providerDetails.iconUrl} alt="" className="size-5 object-contain" />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="max-w-full truncate text-sm font-semibold text-foreground">
              {nickname}
            </h2>
            {(needsReconnect || hasSyncIssue || account.freshness?.syncing) && (
              <AccountStatusBadge
                label={
                  needsReconnect ? 'Reconnect required' : hasSyncIssue ? 'Sync issue' : 'Syncing'
                }
                tone={needsReconnect || hasSyncIssue ? 'danger' : 'neutral'}
              />
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{account.mailboxAddress}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {providerDetails.accountLabel}
            {formatLastSyncedAt(account.lastSyncedAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <Button asChild variant="outline" size="sm" className="min-h-10">
          <Link to={`/app/email/accounts/${getEmailAccountSlug(account)}`}>
            <MailOpen aria-hidden="true" className="size-4" />
            Open inbox
          </Link>
        </Button>
        {needsReconnect && canReconnect && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-10"
            disabled={isReconnecting}
            aria-busy={isReconnecting}
            onClick={onReconnect}
          >
            <RefreshCw
              aria-hidden="true"
              className={isReconnecting ? 'size-4 motion-safe:animate-spin' : 'size-4'}
            />
            {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-10 text-destructive hover:text-destructive"
          onClick={onDisconnect}
        >
          <LogOut aria-hidden="true" className="size-4" />
          Log out
        </Button>
      </div>
    </article>
  );
}

function AccountStatusBadge({ label, tone }: { label: string; tone: 'neutral' | 'danger' }) {
  return (
    <span
      className={
        tone === 'danger'
          ? 'inline-flex shrink-0 items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive'
          : 'inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
      }
    >
      {label}
    </span>
  );
}

function accountNeedsReconnect(account: EmailAccount) {
  return (
    account.status.toUpperCase() === 'ERROR' ||
    account.freshness?.errorCode === 'EMAIL_RECONNECT_REQUIRED' ||
    (account.provider === 'outlook' && account.calendarAccess === 'reauthorizationRequired')
  );
}

function formatLastSyncedAt(lastSyncedAt: string | null) {
  if (!lastSyncedAt) return '';
  const date = parseISO(lastSyncedAt);
  if (!isValid(date)) return '';
  return ` · Synced ${formatDistanceToNow(date, { addSuffix: true })}`;
}
