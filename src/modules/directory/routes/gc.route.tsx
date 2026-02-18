import { Route, Routes } from 'react-router-dom';

import { GCDetailPage, GCFormPage, GCListPage } from '../pages';

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
