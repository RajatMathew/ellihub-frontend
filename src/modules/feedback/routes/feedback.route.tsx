import { NotFound } from '@/app/components/error/not-found';
import { FeedbackListPage } from '@/modules/feedback/pages/feedback-list';
import { Route, Routes } from 'react-router-dom';

/**
 * Not mounted. The Feedback page was taken out of the app — its sidebar entry
 * and its `feedback/*` route — and this router is kept, unregistered, with the
 * page it renders. Feedback is still sent and browsed from the header's
 * Feedback dialog (`MarkFeedbackDialog`) and the mailbox's ask prompt, which
 * never linked here. To bring the page back, register this in `routeTree` and
 * add the sidebar entry again.
 */
export default function FeedbackRoute() {
  return (
    <Routes>
      <Route index element={<FeedbackListPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
