import { NotFound } from '@/app/components/error/not-found';
import { LookupListPage } from '@/modules/lookup/pages';
import { Route, Routes } from 'react-router-dom';

export default function LookupModuleRoutes() {
  return (
    <Routes>
      <Route index element={<LookupListPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
