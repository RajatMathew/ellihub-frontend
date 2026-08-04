import { useEffect, useRef } from 'react';

import { NotFound } from '@/app/components/error/not-found';
import type { SharedMailboxKey } from '@/modules/email/api';
import {
  EmailAccountEmptyState,
  EmailAccountsErrorState,
  EmailAccountsLoadingState,
} from '@/modules/email/components/email-account-empty-state';
import { useEmailAccountsQuery, useEmailConfigQuery } from '@/modules/email/hooks';
import { EmailAccountsPage } from '@/modules/email/pages/email-accounts-page';
import { MailboxPage } from '@/modules/email/pages/mailbox-page';
import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const SHARED_MAILBOX_LABELS: Record<SharedMailboxKey, string> = {
  procurement: 'Procurement',
  requisitions: 'Requisitions',
  contracts: 'Contracts',
};

export default function EmailRoutes() {
  return (
    <>
      <EmailAuthResultToast />
      <Routes>
        <Route index element={<EmailIndexRoute />} />
        <Route path="procurement" element={<SharedMailboxRoute sharedMailboxKey="procurement" />} />
        <Route
          path="requisitions"
          element={<SharedMailboxRoute sharedMailboxKey="requisitions" />}
        />
        <Route path="contracts" element={<SharedMailboxRoute sharedMailboxKey="contracts" />} />
        <Route path="add-account" element={<EmailAddAccountRoute />} />
        <Route path="accounts" element={<EmailAccountsPage />} />
        <Route path="accounts/:accountSlug" element={<ConnectedMailboxRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function EmailAuthResultToast() {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledAuthResultRef = useRef<string | null>(null);

  useEffect(() => {
    const result = searchParams.get('emailAuth');
    if (!result) return;

    const message = searchParams.get('message') || 'Email account connection failed.';
    const requestId = searchParams.get('requestId') || '';
    const toastKey = `${result}:${message}:${requestId}`;
    if (handledAuthResultRef.current === toastKey) return;
    handledAuthResultRef.current = toastKey;

    if (result === 'error') {
      toast.error(message);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('emailAuth');
    next.delete('message');
    next.delete('requestId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return null;
}

function EmailIndexRoute() {
  return <Navigate to="procurement" replace />;
}

function EmailAddAccountRoute() {
  const accountsQuery = useEmailAccountsQuery();
  const configQuery = useEmailConfigQuery();

  if (accountsQuery.isLoading || configQuery.isLoading) return <EmailAccountsLoadingState />;
  if (accountsQuery.isError) {
    return <EmailAccountsErrorState onRetry={() => void accountsQuery.refetch()} />;
  }
  if (configQuery.isError) {
    return <EmailAccountsErrorState onRetry={() => void configQuery.refetch()} />;
  }
  if (!configQuery.data) return <EmailAccountsLoadingState />;

  const personalAccountCount =
    accountsQuery.data?.filter((account) => !account.sharedMailboxKey).length ?? 0;
  if (personalAccountCount >= configQuery.data.maxPersonalAccounts) {
    return <Navigate to="/app/email/accounts" replace />;
  }

  return <EmailAccountEmptyState />;
}

function SharedMailboxRoute({ sharedMailboxKey }: { sharedMailboxKey: SharedMailboxKey }) {
  const accountsQuery = useEmailAccountsQuery();
  const account = accountsQuery.data?.find(
    (candidate) => candidate.sharedMailboxKey === sharedMailboxKey
  );
  const label = SHARED_MAILBOX_LABELS[sharedMailboxKey];

  if (accountsQuery.isLoading) return <EmailAccountsLoadingState />;
  if (accountsQuery.isError) {
    return <EmailAccountsErrorState onRetry={() => void accountsQuery.refetch()} />;
  }

  if (account) return <MailboxPage accountSlug={account.id} />;

  return (
    <EmailAccountEmptyState
      sharedMailboxKey={sharedMailboxKey}
      title={`Connect ${label}`}
      description={`Connect the ${label.toLowerCase()} mailbox for the team. After connecting, choose the short name that appears in the shared mailbox list.`}
    />
  );
}

function ConnectedMailboxRoute() {
  const { accountSlug } = useParams();

  if (!accountSlug) return <NotFound />;

  return <MailboxPage accountSlug={accountSlug} />;
}
