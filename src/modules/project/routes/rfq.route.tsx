import { Route, Routes } from 'react-router-dom';

import RFQDetailPage from '@modules/project/pages/rfq-detail';
import RFQFormPage from '@modules/project/pages/rfq-form';
import RFQListPage from '@modules/project/pages/rfq-list';

const RFQRoutes = () => {
  return (
    <Routes>
      <Route index element={<RFQListPage />} />
      <Route path="create" element={<RFQFormPage />} />
      <Route path=":rfqId" element={<RFQDetailPage />} />
      <Route path=":rfqId/edit" element={<RFQFormPage />} />
    </Routes>
  );
};

export default RFQRoutes;
