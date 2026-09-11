import { NotFound } from '@/app/components/error/not-found';
import { EMAIL_MAILBOXES } from '@/modules/email/constants/email-mailboxes';
import { EmailComingSoonPage } from '@/modules/email/pages/email-coming-soon-page';
import AccountingMailbox from '@/modules/email/requisitions/requisitions-inbox';
import { Navigate, Route, Routes } from 'react-router-dom';

export default function EmailRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to={EMAIL_MAILBOXES[0].key} replace />} />
      {EMAIL_MAILBOXES.map((mailbox) => (
        <Route
          key={mailbox.key}
          path={mailbox.key}
          element={
            // requisitions@ is live (its Tasks board is fed by the Requisitions module);
            // the other mailboxes stay on the coming-soon page.
            mailbox.key === 'requisitions'
              ? <AccountingMailbox mailbox="requisitions" />
              : <EmailComingSoonPage mailbox={mailbox.key} />
          }
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

