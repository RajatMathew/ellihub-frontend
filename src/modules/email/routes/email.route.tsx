import { NotFound } from '@/app/components/error/not-found';
import { EMAIL_SELECTED_ACCOUNT_STORAGE_KEY } from '@/modules/email/constants/email-account-storage';
import { EMAIL_MAILBOXES } from '@/modules/email/constants/email-mailboxes';
import { MailboxPage } from '@/modules/email/pages/mailbox-page';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

export default function EmailRoutes() {
  return (
    <Routes>
      <Route index element={<EmailIndexRoute />} />
      {EMAIL_MAILBOXES.map((mailbox) => (
        <Route
          key={mailbox.key}
          path={mailbox.key}
          element={<MailboxPage mailbox={mailbox.key} />}
        />
      ))}
      <Route path="accounts/:accountSlug" element={<ConnectedMailboxRoute />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function EmailIndexRoute() {
  const selectedAccountId =
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);

  return (
    <Navigate
      to={selectedAccountId ? `accounts/${selectedAccountId}` : EMAIL_MAILBOXES[0].key}
      replace
    />
  );
}

function ConnectedMailboxRoute() {
  const { accountSlug } = useParams();

  if (!accountSlug) return <NotFound />;

  return <MailboxPage accountSlug={accountSlug} />;
}
