import { useEffect, useRef } from 'react';

import { NotFound } from '@/app/components/error/not-found';
import { EmailAccountEmptyState } from '@/modules/email/components/email-account-empty-state';
import { EmailAccountsPage } from '@/modules/email/pages/email-accounts-page';
import { MailboxPage } from '@/modules/email/pages/mailbox-page';
import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function EmailRoutes() {
  return (
    <>
      <EmailAuthResultToast />
      <Routes>
        <Route index element={<EmailIndexRoute />} />
        <Route path="add-account" element={<EmailAccountEmptyState />} />
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
  return <Navigate to="add-account" replace />;
}

function ConnectedMailboxRoute() {
  const { accountSlug } = useParams();

  if (!accountSlug) return <NotFound />;

  return <MailboxPage accountSlug={accountSlug} />;
}
