import { Navigate, Route, Routes } from 'react-router-dom';

import MembersPage from '@/modules/settings/pages/members-page';

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="members" replace />} />
      <Route path="members" element={<MembersPage />} />
    </Routes>
  );
}

