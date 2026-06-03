import { NotFound } from '@/app/components/error/not-found';
import { PODetailPage, POFormPage, ProjectPOs } from '@/modules/project/pages/purchase-order';
import { Route, Routes } from 'react-router-dom';

const PORoutes = () => {
  return (
    <Routes>
      <Route index element={<ProjectPOs />} />
      <Route path="create" element={<POFormPage />} />
      <Route path=":poId" element={<PODetailPage />} />
      <Route path=":poId/edit" element={<POFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default PORoutes;
