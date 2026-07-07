import { NotFound } from '@/app/components/error/not-found';
import { EMAIL_MAILBOXES } from '@/modules/email/constants/email-mailboxes';
import { MailboxPage } from '@/modules/email/pages/mailbox-page';
import { Navigate, Route, Routes } from 'react-router-dom';

export default function EmailRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to={EMAIL_MAILBOXES[0].key} replace />} />
      {EMAIL_MAILBOXES.map((mailbox) => (
        <Route
          key={mailbox.key}
          path={mailbox.key}
          element={<MailboxPage mailbox={mailbox.key} />}
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
