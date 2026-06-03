import { NotFound } from '@/app/components/error/not-found';
import { GCDetailPage, GCFormPage, GCListPage } from '@/modules/directory/pages';
import { Route, Routes } from 'react-router-dom';

const GCRoutes = () => {
  return (
    <Routes>
      <Route index element={<GCListPage />} />
      <Route path="create" element={<GCFormPage />} />
      <Route path=":id" element={<GCDetailPage />} />
      <Route path=":id/edit" element={<GCFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default GCRoutes;
