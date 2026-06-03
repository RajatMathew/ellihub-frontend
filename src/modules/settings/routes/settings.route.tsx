import { NotFound } from '@/app/components/error/not-found';
import MembersPage from '@/modules/settings/pages/members-page';
import { Navigate, Route, Routes } from 'react-router-dom';

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="members" replace />} />
      <Route path="members" element={<MembersPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
