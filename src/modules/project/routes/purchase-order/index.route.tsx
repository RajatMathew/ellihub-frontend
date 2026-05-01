import { Route, Routes } from 'react-router-dom';

import {
  PODetailPage,
  POFormPage,
  ProjectPOs,
} from '@/modules/project/pages/purchase-order';

const PORoutes = () => {
  return (
    <Routes>
      <Route index element={<ProjectPOs />} />
      <Route path="create" element={<POFormPage />} />
      <Route path=":poId" element={<PODetailPage />} />
      <Route path=":poId/edit" element={<POFormPage />} />
    </Routes>
  );
};

export default PORoutes;
