import { Route, Routes } from 'react-router-dom';

import { LookupListPage } from '@/modules/lookup/pages';

export default function LookupModuleRoutes() {
  return (
    <Routes>
      <Route index element={<LookupListPage />} />
    </Routes>
  );
}
