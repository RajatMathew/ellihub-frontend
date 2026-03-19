import { Route, Routes } from 'react-router-dom';

import { POFormPage } from '@modules/project/pages/po-form';
import { PODetailPage } from '@modules/purchase-orders/pages/po-detail';
import ProjectPOs from '@modules/project/pages/purchase-orders';

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
