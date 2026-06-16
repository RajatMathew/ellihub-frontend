import { NotFound } from '@/app/components/error/not-found';
import ActivityLogListPage from '@/modules/activity-log/pages/activity-log-list';
import { Route, Routes } from 'react-router-dom';

export default function ActivityLogModuleRoutes() {
  return (
    <Routes>
      <Route index element={<ActivityLogListPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
