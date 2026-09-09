import { NotFound } from '@/app/components/error/not-found';
import { SharedMailboxDiscoveryFlow } from '@/app/components/shared-mailbox-discovery-flow';
import {
  EmailAccountEmptyState,
  EmailAccountsErrorState,
  EmailAccountsLoadingState,
} from '@/modules/email/components/email-account-empty-state';
import { EmailConnectErrorDialog } from '@/modules/email/components/email-connect-error-dialog';
import { useEmailAccountsQuery, useEmailConfigQuery } from '@/modules/email/hooks';
import { EmailAccountsPage } from '@/modules/email/pages/email-accounts-page';
import { MailboxPage } from '@/modules/email/pages/mailbox-page';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';

export default function EmailRoutes() {
  return (
    <>
      <EmailAuthResultBanner />
      <SharedMailboxDiscoveryFlow />
      <Routes>
        <Route index element={<EmailIndexRoute />} />
        <Route path="add-account" element={<EmailAddAccountRoute />} />
        <Route path="accounts" element={<EmailAccountsPage />} />
        <Route path="accounts/:accountSlug" element={<ConnectedMailboxIndexRedirect />} />
        <Route path="accounts/:accountSlug/:folder" element={<ConnectedMailboxRoute />} />
        <Route
          path="accounts/:accountSlug/:folder/id/:messageId"
          element={<ConnectedMailboxRoute />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function EmailAuthResultBanner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const result = searchParams.get('emailAuth');
  const message = searchParams.get('message') || 'Email account connection failed.';
  const requestId = searchParams.get('requestId') || '';
  const isError = result === 'error';

  const handleClose = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('emailAuth');
    next.delete('message');
    next.delete('requestId');
    setSearchParams(next, { replace: true });
  };

  return (
    <EmailConnectErrorDialog
      open={isError}
      message={message}
      requestId={requestId || undefined}
      onClose={handleClose}
    />
  );
}

function EmailIndexRoute() {
  const accountsQuery = useEmailAccountsQuery();

  if (accountsQuery.isLoading) return <EmailAccountsLoadingState />;
  if (accountsQuery.isError) {
    return <EmailAccountsErrorState onRetry={() => void accountsQuery.refetch()} />;
  }

  const firstAccount = accountsQuery.data?.[0];
  if (firstAccount) {
    // The slug (falling back to the id only inside getEmailAccountSlug itself,
    // when nothing better exists), not the raw id — every other link into a
    // mailbox uses it, and the URL should read the same way regardless of how
    // it was reached.
    return <Navigate to={`accounts/${getEmailAccountSlug(firstAccount)}`} replace />;
  }
  return <Navigate to="add-account" replace />;
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

function ConnectedMailboxIndexRedirect() {
  const { accountSlug } = useParams();
  const [searchParams] = useSearchParams();

  if (!accountSlug) return <NotFound />;

  const search = searchParams.toString();
  return <Navigate to={`inbox${search ? `?${search}` : ''}`} replace />;
}

function ConnectedMailboxRoute() {
  const { accountSlug, folder, messageId } = useParams();

  if (!accountSlug) return <NotFound />;

  return <MailboxPage accountSlug={accountSlug} folder={folder} conversationId={messageId} />;
}
