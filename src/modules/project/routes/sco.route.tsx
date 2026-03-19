import { Route, Routes } from 'react-router-dom';

import { SCODetailPage } from '@modules/project/pages/sco-detail';
import { SCOFormPage } from '@modules/project/pages/sco-form';
import ProjectSCOs from '@modules/project/pages/subcontractor-change-orders';

const SCORoutes = () => {
  return (
    <Routes>
      <Route index element={<ProjectSCOs />} />
      <Route path="create" element={<SCOFormPage />} />
      <Route path=":scoId" element={<SCODetailPage />} />
      <Route path=":scoId/edit" element={<SCOFormPage />} />
    </Routes>
  );
};

export default SCORoutes;
