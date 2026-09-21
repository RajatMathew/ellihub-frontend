import { NotFound } from '@/app/components/error/not-found';
import { FeedbackListPage } from '@/modules/feedback/pages/feedback-list';
import { Route, Routes } from 'react-router';

export default function FeedbackRoute() {
  return (
    <Routes>
      <Route index element={<FeedbackListPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
