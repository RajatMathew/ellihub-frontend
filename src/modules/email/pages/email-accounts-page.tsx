import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { EmailAccount } from '@/modules/email/api';
import {
  EmailAccountEmptyState,
  EmailAccountsErrorState,
  EmailAccountsLoadingState,
} from '@/modules/email/components/email-account-empty-state';
import { EmailAccountNicknameDialog } from '@/modules/email/components/email-account-nickname-dialog';
import { EMAIL_PROVIDER_DETAILS } from '@/modules/email/constants/email-providers';
import {
  useDisconnectEmailAccountMutation,
  useEmailAccountsQuery,
  useStartEmailAuthMutation,
  useUpdateEmailAccountNicknameMutation,
} from '@/modules/email/hooks';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { MailCheck, MailOpen, Pencil, Plus, RefreshCw, Unplug } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmailAccountsPage() {
  const accountsQuery = useEmailAccountsQuery();
  const startAuthMutation = useStartEmailAuthMutation();
  const updateNicknameMutation = useUpdateEmailAccountNicknameMutation();
  const disconnectMutation = useDisconnectEmailAccountMutation();
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [disconnectingAccount, setDisconnectingAccount] = useState<EmailAccount | null>(null);

  if (accountsQuery.isLoading) return <EmailAccountsLoadingState />;
  if (accountsQuery.isError) {
    return <EmailAccountsErrorState onRetry={() => void accountsQuery.refetch()} />;
  }

  const accounts = accountsQuery.data ?? [];
  if (accounts.length === 0) return <EmailAccountEmptyState />;

  return (
    <>
      <main className="flex h-[calc(100dvh-var(--header-height-mobile))] overflow-y-auto bg-muted/20 px-4 py-10 lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)] lg:px-8">
        <section
          className="m-auto w-full max-w-3xl"
          aria-labelledby="connected-email-accounts-heading"
        >
          <header className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-background text-primary shadow-xs">
              <MailCheck aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </div>
            <h1
              id="connected-email-accounts-heading"
              className="mt-5 text-2xl font-semibold tracking-tight text-foreground"
            >
              Connected email accounts
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Open a mailbox, update its Elli email name, or manage its connection.
            </p>
            <Button asChild className="mt-6 min-h-10">
              <Link to="/app/email/add-account">
                <Plus aria-hidden="true" className="size-4" />
                Add account
              </Link>
            </Button>
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
                onRename={() => setEditingAccount(account)}
                onReconnect={() =>
                  startAuthMutation.mutate({
                    provider: account.provider,
                    loginHint: account.mailboxAddress,
                  })
                }
                onDisconnect={() => setDisconnectingAccount(account)}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} connected
          </p>
        </section>
      </main>

      {editingAccount && (
        <EmailAccountNicknameDialog
          open
          required={false}
          connectedAddress={editingAccount.mailboxAddress}
          defaultNickname={editingAccount.nickname}
          isSaving={updateNicknameMutation.isPending}
          onOpenChange={(open) => {
            if (!open) setEditingAccount(null);
          }}
          onSave={(nickname) =>
            updateNicknameMutation.mutate(
              { accountId: editingAccount.id, nickname },
              { onSuccess: () => setEditingAccount(null) }
            )
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(disconnectingAccount)}
        onOpenChange={(open) => {
          if (!open && !disconnectMutation.isPending) setDisconnectingAccount(null);
        }}
        title="Disconnect this email account?"
        description={
          disconnectingAccount
            ? `${disconnectingAccount.mailboxAddress} will be removed from Elli. Your provider mailbox and its messages will not be deleted.`
            : ''
        }
        confirmLabel={disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect account'}
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
  onRename,
  onReconnect,
  onDisconnect,
}: {
  account: EmailAccount;
  isReconnecting: boolean;
  onRename: () => void;
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
        <Button type="button" variant="ghost" size="sm" className="min-h-10" onClick={onRename}>
          <Pencil aria-hidden="true" className="size-4" />
          Rename
        </Button>
        {needsReconnect && (
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
          <Unplug aria-hidden="true" className="size-4" />
          Disconnect
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
