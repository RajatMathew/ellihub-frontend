import { GCDetailPage, GCFormPage, GCListPage } from '@/modules/directory/pages';
import { Route, Routes } from 'react-router-dom';

const GCRoutes = () => {
  return (
    <Routes>
      <Route index element={<GCListPage />} />
      <Route path="create" element={<GCFormPage />} />
      <Route path=":id" element={<GCDetailPage />} />
      <Route path=":id/edit" element={<GCFormPage />} />
    </Routes>
  );
};

export default GCRoutes;
