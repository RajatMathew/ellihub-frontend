import { Route, Routes } from 'react-router-dom';

import { PCODetailPage } from '@modules/project/pages/pco-detail';
import { PCOFormPage } from '@modules/project/pages/pco-form';
import { PCOListPage } from '@modules/project/pages/pco-list';

const PCORoutes = () => {
  return (
    <Routes>
      <Route index element={<PCOListPage />} />
      <Route path="create" element={<PCOFormPage />} />
      <Route path=":pcoId" element={<PCODetailPage />} />
      <Route path=":pcoId/edit" element={<PCOFormPage />} />
    </Routes>
  );
};

export default PCORoutes;
