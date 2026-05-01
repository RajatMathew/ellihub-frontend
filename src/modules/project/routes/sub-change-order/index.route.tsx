import { Route, Routes } from 'react-router-dom';

import {
  SCODetailPage,
  SCOFormPage,
  SubChangeOrderListPage,
} from '@/modules/project/pages/sub-change-order';

const SCORoutes = () => {
  return (
    <Routes>
      <Route index element={<SubChangeOrderListPage />} />
      <Route path="create" element={<SCOFormPage />} />
      <Route path=":scoId" element={<SCODetailPage />} />
      <Route path=":scoId/edit" element={<SCOFormPage />} />
    </Routes>
  );
};

export default SCORoutes;
